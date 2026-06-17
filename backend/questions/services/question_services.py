from decimal import Decimal
from uuid import UUID

from django.conf import settings
from django.db import transaction

from content_review.services.review_services import (
    create_approval,
    create_review_entry,
)
from exams.exceptions import (
    ExamNotFoundError,
    PreviousYearPaperNotFoundError,
    SubtopicNotFoundError,
    TopicNotFoundError,
)
from exams.models import Exam, PreviousYearPaper, Subtopic
from exams.selectors.exam_selectors import (
    get_exam_by_id,
    get_previous_year_paper_by_id,
    get_subtopic_by_id,
)
from questions.exceptions import (
    AiGeneratedQuestionInvalidStateError,
    AiGeneratedQuestionNotFoundError,
    ApprovalLevelAuthorityError,
    ApprovalRequiredForPublishError,
    InvalidReviewTransitionError,
    QuestionAlreadyClaimedError,
    QuestionAppearanceNotFoundError,
    QuestionAppearanceNotUniqueError,
    QuestionHasMultipleCorrectOptionsError,
    QuestionHasNoCorrectOptionError,
    QuestionNotClaimedError,
    QuestionNotFoundError,
    QuestionOptionLabelNotUniqueError,
    QuestionOptionNotFoundError,
    QuestionStatNotFoundError,
)
from content_review.models import ContentApproval

from questions.models import (
    AiGeneratedQuestion,
    Question,
    QuestionAppearance,
    QuestionOption,
    QuestionStat,
)
from questions.selectors.question_selectors import (
    get_ai_generated_question_by_id,
    get_question_appearance_by_id,
    get_question_by_id,
    get_question_option_by_id,
)

_VALID_REVIEW_TRANSITIONS = {
    "draft": ["in_review"],
    "in_review": ["sme_review", "approved", "rejected"],
    "sme_review": ["approved", "rejected"],
    "approved": ["published"],
    "published": ["rejected"],
    "rejected": ["draft", "in_review"],
}
_UNSET = object()


def _validate_review_transition(from_status: str, to_status: str) -> None:
    allowed = _VALID_REVIEW_TRANSITIONS.get(from_status, [])
    if to_status not in allowed:
        raise InvalidReviewTransitionError(from_status, to_status)


# Public alias so the admin (and any other caller) can enforce the same
# transition graph without reaching into a private helper.
def assert_valid_review_transition(from_status: str, to_status: str) -> None:
    _validate_review_transition(from_status, to_status)


def _requires_strict_review(question: Question) -> bool:
    """Higher-risk content needs an SME sign-off before publishing.

    Resolved from data, never hardcoded per exam: AI-generated origin,
    minor-audience exams, or an explicit ``requires_sme_review`` exam rule.
    """
    if question.origin == "ai":
        return True
    exam = question.exam
    if getattr(exam, "audience_is_minor", False):
        return True
    return bool((exam.exam_rules or {}).get("requires_sme_review"))


def _accepted_publish_levels(question: Question) -> list[str]:
    """Approval levels that satisfy publishing this question (config-driven)."""
    policy = settings.CONTENT_REVIEW_PUBLISH_POLICY
    key = "strict" if _requires_strict_review(question) else "default"
    return policy.get(key, policy.get("default", ["reviewer", "sme"]))


def assert_publish_allowed(question: Question) -> None:
    """Enforce the configured review policy before a question may be published.

    Raises ApprovalRequiredForPublishError if no ContentApproval exists at an
    approval level accepted by the policy for this question.
    """
    accepted = _accepted_publish_levels(question)
    has_accepted_approval = ContentApproval.objects.filter(
        question_id=question.id, approval_level__in=accepted
    ).exists()
    if not has_accepted_approval:
        raise ApprovalRequiredForPublishError(str(question.id), accepted)


def _ensure_one_correct_option(question_id: UUID) -> None:
    correct_count = QuestionOption.objects.filter(
        question_id=question_id, is_correct=True
    ).count()
    if correct_count == 0:
        raise QuestionHasNoCorrectOptionError(str(question_id))
    if correct_count > 1:
        raise QuestionHasMultipleCorrectOptionsError(str(question_id))


def create_question(
    *,
    exam_id: UUID,
    subtopic_id: UUID,
    stem: str,
    explanation: str | None = None,
    difficulty: int = 2,
    language: str = "as",
    origin: str = "manual",
    tags: dict | None = None,
) -> Question:
    try:
        exam = get_exam_by_id(exam_id=exam_id)
    except Exam.DoesNotExist:
        raise ExamNotFoundError(str(exam_id))

    try:
        subtopic = get_subtopic_by_id(subtopic_id=subtopic_id)
    except Subtopic.DoesNotExist:
        raise SubtopicNotFoundError(str(subtopic_id))

    if subtopic.topic.subject.exam_id != exam_id:
        raise ValueError(
            f"Subtopic {subtopic_id} does not belong to exam {exam_id}"
        )

    with transaction.atomic():
        question = Question.objects.create(
            exam=exam,
            subtopic=subtopic,
            stem=stem,
            explanation=explanation,
            difficulty=difficulty,
            language=language,
            origin=origin,
            tags=tags or {},
        )
        QuestionStat.objects.create(question=question)

    return question


def update_question(
    *,
    question_id: UUID,
    stem: str | None = None,
    explanation: str | None | object = _UNSET,
    difficulty: int | None = None,
    language: str | None = None,
    subtopic_id: UUID | None = None,
    tags: dict | None | object = _UNSET,
) -> Question:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    update_fields: list[str] = []

    if stem is not None:
        question.stem = stem
        update_fields.append("stem")

    if explanation is not _UNSET:
        question.explanation = explanation
        update_fields.append("explanation")

    if difficulty is not None:
        question.difficulty = difficulty
        update_fields.append("difficulty")

    if language is not None:
        question.language = language
        update_fields.append("language")

    if subtopic_id is not None:
        try:
            subtopic = get_subtopic_by_id(subtopic_id=subtopic_id)
        except Subtopic.DoesNotExist:
            raise SubtopicNotFoundError(str(subtopic_id))
        question.subtopic = subtopic
        update_fields.append("subtopic")

    if tags is not _UNSET:
        question.tags = tags or {}
        update_fields.append("tags")

    if update_fields:
        question.save(update_fields=update_fields)
        question.refresh_from_db()

    return question


# Which ContentApproval level a transition into "approved" corresponds to.
# reviewer ⇐ in_review (the /approve/ action) · sme ⇐ sme_review (the
# /sme-approve/ action). PH-3/P0-2: the level is bound to the transition, and an
# authority-gated caller passes its own level which must match — so the
# reviewer endpoint can never mint an SME-level approval.
_APPROVAL_LEVEL_FOR_FROM_STATUS = {"in_review": "reviewer", "sme_review": "sme"}


def _resolve_approval_level(
    *, requested_level: str | None, from_status: str
) -> str:
    expected = _APPROVAL_LEVEL_FOR_FROM_STATUS.get(from_status)
    if requested_level is None:
        # Trusted/full-authority caller (e.g. Django Admin): derive from the
        # transition that was already validated by the state machine.
        return expected
    if requested_level != expected:
        raise ApprovalLevelAuthorityError(requested_level, from_status)
    return requested_level


def update_question_review_status(
    *,
    question_id: UUID,
    review_status: str,
    actor_id: UUID | None = None,
    actor_role: str | None = None,
    comment: str | None = None,
    approval_level: str | None = None,
) -> Question:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    _validate_review_transition(question.review_status, review_status)

    if review_status == "published":
        assert_publish_allowed(question)

    # Resolve (and authority-check) the approval level before any mutation so an
    # inconsistent request — e.g. a reviewer-authority /approve/ on a sme_review
    # question — is rejected without side effects.
    resolved_level: str | None = None
    if review_status == "approved":
        resolved_level = _resolve_approval_level(
            requested_level=approval_level, from_status=question.review_status
        )

    with transaction.atomic():
        old_status = question.review_status
        question.review_status = review_status
        question.save(update_fields=["review_status"])
        question.refresh_from_db()

        create_review_entry(
            question_id=question.id,
            action=_review_status_to_action(review_status),
            from_status=old_status,
            to_status=review_status,
            actor_id=actor_id,
            actor_role=actor_role,
            comment=comment,
        )

        if review_status == "approved":
            create_approval(
                question_id=question.id,
                approver_id=actor_id,
                approval_level=resolved_level,
                note=comment,
            )

    return question


def _review_status_to_action(status: str) -> str:
    mapping = {
        "in_review": "submit",
        "sme_review": "request_sme",
        "approved": "approve",
        "rejected": "reject",
        "published": "publish",
    }
    return mapping.get(status, "edit")


def claim_question_for_review(
    *,
    question_id: UUID,
    user_id: UUID,
) -> Question:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    if question.claimed_by_id is not None:
        raise QuestionAlreadyClaimedError(
            str(question_id), str(question.claimed_by_id)
        )

    with transaction.atomic():
        question.claimed_by_id = user_id
        question.save(update_fields=["claimed_by"])
        question.refresh_from_db()

        create_review_entry(
            question_id=question.id,
            action="claim",
            from_status=question.review_status,
            to_status=question.review_status,
            actor_id=user_id,
        )

    return question


def release_claim(
    *,
    question_id: UUID,
    user_id: UUID,
) -> Question:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    if question.claimed_by_id is None:
        raise QuestionNotClaimedError(str(question_id))

    if question.claimed_by_id != user_id:
        raise QuestionAlreadyClaimedError(
            str(question_id), str(question.claimed_by_id)
        )

    with transaction.atomic():
        question.claimed_by_id = None
        question.save(update_fields=["claimed_by"])
        question.refresh_from_db()

    return question


def delete_question(*, question_id: UUID) -> None:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))
    question.delete()


def create_question_option(
    *,
    question_id: UUID,
    label: str,
    body: str,
    is_correct: bool = False,
    position: int = 0,
) -> QuestionOption:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    if QuestionOption.objects.filter(
        question=question, label=label
    ).exists():
        raise QuestionOptionLabelNotUniqueError(label, str(question_id))

    with transaction.atomic():
        option = QuestionOption.objects.create(
            question=question,
            label=label,
            body=body,
            is_correct=is_correct,
            position=position,
        )

    return option


def update_question_option(
    *,
    option_id: UUID,
    label: str | None = None,
    body: str | None = None,
    is_correct: bool | None = None,
    position: int | None = None,
) -> QuestionOption:
    try:
        option = get_question_option_by_id(option_id=option_id)
    except QuestionOption.DoesNotExist:
        raise QuestionOptionNotFoundError(str(option_id))

    update_fields: list[str] = []

    if label is not None:
        if QuestionOption.objects.filter(
            question=option.question, label=label
        ).exclude(id=option_id).exists():
            raise QuestionOptionLabelNotUniqueError(
                label, str(option.question_id)
            )
        option.label = label
        update_fields.append("label")

    if body is not None:
        option.body = body
        update_fields.append("body")

    if is_correct is not None:
        option.is_correct = is_correct
        update_fields.append("is_correct")

    if position is not None:
        option.position = position
        update_fields.append("position")

    if update_fields:
        option.save(update_fields=update_fields)
        option.refresh_from_db()

    return option


def delete_question_option(*, option_id: UUID) -> None:
    try:
        option = get_question_option_by_id(option_id=option_id)
    except QuestionOption.DoesNotExist:
        raise QuestionOptionNotFoundError(str(option_id))
    option.delete()


def create_question_appearance(
    *,
    question_id: UUID,
    paper_id: UUID,
    year: int,
) -> QuestionAppearance:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    try:
        paper = get_previous_year_paper_by_id(paper_id=paper_id)
    except PreviousYearPaper.DoesNotExist:
        raise PreviousYearPaperNotFoundError(str(paper_id))

    if question.exam_id != paper.exam_id:
        raise ValueError(
            f"Question exam {question.exam_id} does not match "
            f"paper exam {paper.exam_id}"
        )

    if QuestionAppearance.objects.filter(
        question=question, paper=paper
    ).exists():
        raise QuestionAppearanceNotUniqueError(
            str(question_id), str(paper_id)
        )

    with transaction.atomic():
        appearance = QuestionAppearance.objects.create(
            question=question,
            paper=paper,
            year=year,
        )

    return appearance


def delete_question_appearance(*, appearance_id: UUID) -> None:
    try:
        appearance = get_question_appearance_by_id(
            appearance_id=appearance_id
        )
    except QuestionAppearance.DoesNotExist:
        raise QuestionAppearanceNotFoundError(str(appearance_id))
    appearance.delete()


def init_question_stats(*, question_id: UUID) -> QuestionStat:
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    stat, created = QuestionStat.objects.get_or_create(question=question)
    if not created:
        return stat

    return stat


def update_question_stats(
    *,
    question_id: UUID,
    was_correct: bool | None = None,
    time_spent: int = 0,
) -> QuestionStat:
    try:
        stat = QuestionStat.objects.get(question_id=question_id)
    except QuestionStat.DoesNotExist:
        raise QuestionStatNotFoundError(str(question_id))

    with transaction.atomic():
        stat.attempts += 1
        if was_correct is True:
            stat.correct += 1
        elif was_correct is False:
            pass

        if stat.attempts > 0:
            stat.success_rate = Decimal(
                str(round(stat.correct / stat.attempts * 100, 2))
            )

        total_time_seconds = Decimal(str(stat.avg_time_seconds)) * Decimal(
            str(stat.attempts - 1)
        )
        total_time_seconds += Decimal(str(time_spent))
        stat.avg_time_seconds = Decimal(
            str(
                round(
                    float(total_time_seconds) / stat.attempts,
                    2,
                )
            )
        )

        stat.save(update_fields=["attempts", "correct", "success_rate", "avg_time_seconds"])
        stat.refresh_from_db()

    return stat


def recalculate_question_stats(*, question_id: UUID) -> QuestionStat:
    """Recalculates question statistics based on all user answers under scored attempts.

    This is fully idempotent and safe to run concurrently due to select_for_update lock.
    """
    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    with transaction.atomic():
        stat, created = QuestionStat.objects.get_or_create(question=question)
        stat = QuestionStat.objects.select_for_update().get(question=question)

        from attempts.models import UserAnswer
        from django.db.models import Count, Q, Avg

        res = UserAnswer.objects.filter(
            question_id=question_id,
            attempt__status="scored",
            state__in=["answered", "answered_marked"],
        ).aggregate(
            total_attempts=Count("id"),
            total_correct=Count("id", filter=Q(is_correct=True)),
            avg_time=Avg("time_spent_seconds"),
        )

        attempts = res["total_attempts"] or 0
        correct = res["total_correct"] or 0
        avg_time = res["avg_time"] or 0

        stat.attempts = attempts
        stat.correct = correct
        stat.success_rate = (
            Decimal(str(round((correct / attempts) * 100, 2)))
            if attempts > 0
            else Decimal("0.00")
        )
        stat.avg_time_seconds = (
            Decimal(str(round(avg_time, 2))) if avg_time else Decimal("0.00")
        )
        stat.save(
            update_fields=[
                "attempts",
                "correct",
                "success_rate",
                "avg_time_seconds",
            ]
        )
        stat.refresh_from_db()

    return stat


def create_ai_generated_question(
    *,
    exam_id: UUID,
    subtopic_id: UUID | None = None,
    model_used: str,
    prompt: str | None = None,
    constraints_snapshot: dict | None = None,
    raw_output: str | None = None,
    validation: dict | None = None,
    credits_charged: Decimal | int = 0,
    generation_batch: UUID | None = None,
) -> AiGeneratedQuestion:
    try:
        exam = get_exam_by_id(exam_id=exam_id)
    except Exam.DoesNotExist:
        raise ExamNotFoundError(str(exam_id))

    with transaction.atomic():
        ai_gen = AiGeneratedQuestion.objects.create(
            exam=exam,
            subtopic_id=subtopic_id,
            generation_batch=generation_batch,
            model_used=model_used,
            prompt=prompt,
            constraints_snapshot=constraints_snapshot or {},
            raw_output=raw_output,
            validation=validation or {},
            credits_charged=credits_charged,
        )

    return ai_gen


def update_ai_generated_question(
    *,
    ai_gen_id: UUID,
    subtopic_id: UUID | None = None,
    model_used: str | None = None,
    prompt: str | None | object = _UNSET,
    constraints_snapshot: dict | None | object = _UNSET,
    raw_output: str | None | object = _UNSET,
    validation: dict | None | object = _UNSET,
    credits_charged: Decimal | int | None = None,
    generation_batch: UUID | None | object = _UNSET,
    status: str | None = None,
) -> AiGeneratedQuestion:
    try:
        ai_gen = get_ai_generated_question_by_id(ai_gen_id=ai_gen_id)
    except AiGeneratedQuestion.DoesNotExist:
        raise AiGeneratedQuestionNotFoundError(str(ai_gen_id))

    update_fields: list[str] = []

    if subtopic_id is not None:
        ai_gen.subtopic_id = subtopic_id
        update_fields.append("subtopic")

    if model_used is not None:
        ai_gen.model_used = model_used
        update_fields.append("model_used")

    if prompt is not _UNSET:
        ai_gen.prompt = prompt
        update_fields.append("prompt")

    if constraints_snapshot is not _UNSET:
        ai_gen.constraints_snapshot = constraints_snapshot or {}
        update_fields.append("constraints_snapshot")

    if raw_output is not _UNSET:
        ai_gen.raw_output = raw_output
        update_fields.append("raw_output")

    if validation is not _UNSET:
        ai_gen.validation = validation or {}
        update_fields.append("validation")

    if credits_charged is not None:
        ai_gen.credits_charged = credits_charged
        update_fields.append("credits_charged")

    if generation_batch is not _UNSET:
        ai_gen.generation_batch = generation_batch
        update_fields.append("generation_batch")

    if status is not None:
        ai_gen.status = status
        update_fields.append("status")

    if update_fields:
        ai_gen.save(update_fields=update_fields)
        ai_gen.refresh_from_db()

    return ai_gen


def delete_ai_generated_question(*, ai_gen_id: UUID) -> None:
    try:
        ai_gen = get_ai_generated_question_by_id(ai_gen_id=ai_gen_id)
    except AiGeneratedQuestion.DoesNotExist:
        raise AiGeneratedQuestionNotFoundError(str(ai_gen_id))
    ai_gen.delete()


def promote_ai_generated_question(
    *,
    ai_gen_id: UUID,
    stem: str,
    subtopic_id: UUID,
    explanation: str | None = None,
    difficulty: int = 2,
    language: str = "as",
    tags: dict | None = None,
) -> tuple[AiGeneratedQuestion, Question]:
    try:
        ai_gen = get_ai_generated_question_by_id(ai_gen_id=ai_gen_id)
    except AiGeneratedQuestion.DoesNotExist:
        raise AiGeneratedQuestionNotFoundError(str(ai_gen_id))

    if ai_gen.status != "validated":
        raise AiGeneratedQuestionInvalidStateError(
            str(ai_gen_id), ai_gen.status, "validated"
        )

    try:
        subtopic = get_subtopic_by_id(subtopic_id=subtopic_id)
    except Subtopic.DoesNotExist:
        raise SubtopicNotFoundError(str(subtopic_id))

    with transaction.atomic():
        question = Question.objects.create(
            exam=ai_gen.exam,
            subtopic=subtopic,
            stem=stem,
            explanation=explanation,
            difficulty=difficulty,
            language=language,
            origin="ai",
            tags=tags or {},
        )
        QuestionStat.objects.create(question=question)

        ai_gen.status = "promoted"
        ai_gen.resulting_question = question
        ai_gen.save(update_fields=["status", "resulting_question"])
        ai_gen.refresh_from_db()

    return ai_gen, question
