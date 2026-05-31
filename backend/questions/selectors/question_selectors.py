from uuid import UUID

from django.db.models import Prefetch, QuerySet

from questions.models import (
    AiGeneratedQuestion,
    Question,
    QuestionAppearance,
    QuestionOption,
    QuestionStat,
)

_OPTIONS_PREFETCH = Prefetch(
    "options", queryset=QuestionOption.objects.order_by("position")
)


# ── Individual Retrieval ─────────────────────────────────────────────────────


def get_question_by_id(*, question_id: UUID) -> Question:
    return (
        Question.objects.select_related(
            "exam", "subtopic__topic__subject__exam", "verified_by"
        )
        .prefetch_related(_OPTIONS_PREFETCH)
        .get(id=question_id)
    )


def get_question_option_by_id(*, option_id: UUID) -> QuestionOption:
    return QuestionOption.objects.select_related("question").get(id=option_id)


def get_question_appearance_by_id(*, appearance_id: UUID) -> QuestionAppearance:
    return QuestionAppearance.objects.select_related(
        "question", "paper"
    ).get(id=appearance_id)


def get_question_stat_by_id(*, question_id: UUID) -> QuestionStat:
    return QuestionStat.objects.select_related("question").get(
        question_id=question_id
    )


def get_ai_generated_question_by_id(*, ai_gen_id: UUID) -> AiGeneratedQuestion:
    return AiGeneratedQuestion.objects.select_related(
        "exam", "subtopic", "resulting_question"
    ).get(id=ai_gen_id)


# ── Listing: Questions ───────────────────────────────────────────────────────


def list_questions(
    *, exam_id: UUID | None = None, review_status: str | None = None
) -> QuerySet[Question]:
    qs = Question.objects.select_related(
        "exam", "subtopic__topic__subject", "verified_by"
    ).prefetch_related(_OPTIONS_PREFETCH)
    if exam_id is not None:
        qs = qs.filter(exam_id=exam_id)
    if review_status is not None:
        qs = qs.filter(review_status=review_status)
    return qs.order_by("-created_at")


def list_questions_for_exam(
    *, exam_id: UUID, review_status: str | None = None
) -> QuerySet[Question]:
    qs = Question.objects.filter(exam_id=exam_id).select_related(
        "exam", "subtopic__topic__subject", "verified_by"
    )
    if review_status is not None:
        qs = qs.filter(review_status=review_status)
    return qs.order_by("-created_at")


def list_questions_for_subtopic(
    *, subtopic_id: UUID
) -> QuerySet[Question]:
    return Question.objects.filter(subtopic_id=subtopic_id).select_related(
        "exam", "subtopic__topic__subject", "verified_by"
    ).order_by("-created_at")


def list_questions_by_difficulty(
    *, difficulty: int, exam_id: UUID | None = None
) -> QuerySet[Question]:
    qs = Question.objects.filter(difficulty=difficulty).select_related(
        "exam", "subtopic__topic__subject", "verified_by"
    )
    if exam_id is not None:
        qs = qs.filter(exam_id=exam_id)
    return qs.order_by("-created_at")


def list_published_questions_for_exam(
    *, exam_id: UUID
) -> QuerySet[Question]:
    return (
        Question.objects.filter(
            exam_id=exam_id, review_status="published"
        )
        .select_related("exam", "subtopic__topic__subject", "verified_by")
        .prefetch_related(
            Prefetch(
                "options",
                queryset=QuestionOption.objects.order_by("position"),
            )
        )
        .order_by("subtopic__topic__subject__position", "subtopic__position")
    )


# ── Listing: Options ─────────────────────────────────────────────────────────


def list_question_options_for_question(
    *, question_id: UUID
) -> QuerySet[QuestionOption]:
    return QuestionOption.objects.filter(
        question_id=question_id
    ).order_by("position")


# ── Listing: Appearances ─────────────────────────────────────────────────────


def list_question_appearances_for_question(
    *, question_id: UUID
) -> QuerySet[QuestionAppearance]:
    return QuestionAppearance.objects.filter(
        question_id=question_id
    ).select_related("paper").order_by("-year")


# ── Listing: Stats ───────────────────────────────────────────────────────────


def get_question_stats(
    *, question_ids: list[UUID] | None = None
) -> QuerySet[QuestionStat]:
    qs = QuestionStat.objects.select_related("question")
    if question_ids is not None:
        qs = qs.filter(question_id__in=question_ids)
    return qs.order_by("-attempts")


# ── Listing: AI Generated ────────────────────────────────────────────────────


def list_ai_generations_for_exam(
    *, exam_id: UUID, status: str | None = None
) -> QuerySet[AiGeneratedQuestion]:
    qs = AiGeneratedQuestion.objects.filter(exam_id=exam_id).select_related(
        "exam", "subtopic", "resulting_question"
    )
    if status is not None:
        qs = qs.filter(status=status)
    return qs.order_by("-created_at")
