from decimal import Decimal
from uuid import UUID

from django.db import transaction

from attempts.exceptions import (
    AttemptAlreadyScoredError,
    AttemptAlreadySubmittedError,
    DuplicateAnswerError,
    ExamAttemptNotFoundError,
    InvalidAttemptTransitionError,
    MockTestNotFoundError,
    MockTestNotPublishedError,
    MockTestQuestionNotFoundError,
    MockTestQuestionNotUniqueError,
    UserAnswerNotFoundError,
)
from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer
from attempts.selectors.attempt_selectors import (
    get_exam_attempt_by_id,
    get_mock_test_by_id,
    get_mock_test_question_by_id,
)
from exams.exceptions import ExamNotFoundError
from exams.models import Exam
from exams.selectors.exam_selectors import get_exam_by_id
from questions.exceptions import QuestionNotFoundError
from questions.models import Question
from questions.selectors.question_selectors import get_question_by_id

_VALID_ATTEMPT_TRANSITIONS = {
    "created": ["in_progress"],
    "in_progress": ["submitted"],
    "submitted": ["scored"],
    "scored": [],
}
_UNSET = object()


def _validate_attempt_transition(from_status: str, to_status: str) -> None:
    allowed = _VALID_ATTEMPT_TRANSITIONS.get(from_status, [])
    if to_status not in allowed:
        raise InvalidAttemptTransitionError(from_status, to_status)


# ── Mock Test ──────────────────────────────────────────────────────────────


def create_mock_test(
    *,
    exam_id: UUID,
    name: str,
    type: str,
    duration_seconds: int,
    total_questions: int,
    created_by_id: UUID | None = None,
    previous_year_paper_id: UUID | None = None,
    config: dict | None = None,
    is_published: bool = False,
) -> MockTest:
    try:
        exam = get_exam_by_id(exam_id=exam_id)
    except Exam.DoesNotExist:
        raise ExamNotFoundError(str(exam_id))

    with transaction.atomic():
        mock_test = MockTest.objects.create(
            exam=exam,
            name=name,
            type=type,
            created_by_id=created_by_id,
            previous_year_paper_id=previous_year_paper_id,
            duration_seconds=duration_seconds,
            total_questions=total_questions,
            config=config or {},
            is_published=is_published,
        )

    return mock_test


def update_mock_test(
    *,
    mock_test_id: UUID,
    name: str | None = None,
    duration_seconds: int | None = None,
    total_questions: int | None = None,
    config: dict | None | object = _UNSET,
    is_published: bool | None = None,
) -> MockTest:
    try:
        mock_test = get_mock_test_by_id(mock_test_id=mock_test_id)
    except MockTest.DoesNotExist:
        raise MockTestNotFoundError(str(mock_test_id))

    update_fields: list[str] = []

    if name is not None:
        mock_test.name = name
        update_fields.append("name")

    if duration_seconds is not None:
        mock_test.duration_seconds = duration_seconds
        update_fields.append("duration_seconds")

    if total_questions is not None:
        mock_test.total_questions = total_questions
        update_fields.append("total_questions")

    if config is not _UNSET:
        mock_test.config = config or {}
        update_fields.append("config")

    if is_published is not None:
        mock_test.is_published = is_published
        update_fields.append("is_published")

    if update_fields:
        mock_test.save(update_fields=update_fields)
        mock_test.refresh_from_db()

    return mock_test


def delete_mock_test(*, mock_test_id: UUID) -> None:
    try:
        mock_test = get_mock_test_by_id(mock_test_id=mock_test_id)
    except MockTest.DoesNotExist:
        raise MockTestNotFoundError(str(mock_test_id))
    mock_test.delete()


def add_question_to_mock_test(
    *,
    mock_test_id: UUID,
    question_id: UUID,
    position: int,
    section: str | None = None,
    marks: Decimal | int = 1,
) -> MockTestQuestion:
    try:
        mock_test = get_mock_test_by_id(mock_test_id=mock_test_id)
    except MockTest.DoesNotExist:
        raise MockTestNotFoundError(str(mock_test_id))

    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    if MockTestQuestion.objects.filter(
        mock_test=mock_test, question=question
    ).exists():
        raise MockTestQuestionNotUniqueError(
            str(mock_test_id), str(question_id)
        )

    with transaction.atomic():
        mtq = MockTestQuestion.objects.create(
            mock_test=mock_test,
            question=question,
            position=position,
            section=section,
            marks=marks,
        )

    return mtq


def remove_question_from_mock_test(
    *, mock_test_question_id: UUID
) -> None:
    try:
        mtq = get_mock_test_question_by_id(
            mock_test_question_id=mock_test_question_id
        )
    except MockTestQuestion.DoesNotExist:
        raise MockTestQuestionNotFoundError(str(mock_test_question_id))
    mtq.delete()


# ── Exam Attempt ──────────────────────────────────────────────────────────


def create_attempt(
    *,
    user_id: UUID,
    exam_id: UUID,
    attempt_type: str,
    mock_test_id: UUID | None = None,
    duration_seconds: int | None = None,
) -> ExamAttempt:
    try:
        exam = get_exam_by_id(exam_id=exam_id)
    except Exam.DoesNotExist:
        raise ExamNotFoundError(str(exam_id))

    with transaction.atomic():
        attempt = ExamAttempt.objects.create(
            user_id=user_id,
            exam=exam,
            mock_test_id=mock_test_id,
            attempt_type=attempt_type,
            duration_seconds=duration_seconds,
        )

    return attempt


def start_attempt(*, attempt_id: UUID) -> ExamAttempt:
    try:
        attempt = get_exam_attempt_by_id(attempt_id=attempt_id)
    except ExamAttempt.DoesNotExist:
        raise ExamAttemptNotFoundError(str(attempt_id))

    _validate_attempt_transition(attempt.status, "in_progress")

    if attempt.mock_test_id:
        mock_test = attempt.mock_test
        if not mock_test.is_published:
            raise MockTestNotPublishedError(str(attempt.mock_test_id))
        attempt.duration_seconds = mock_test.duration_seconds
        attempt.total_questions = mock_test.questions.count()

    with transaction.atomic():
        from django.utils import timezone

        attempt.status = "in_progress"
        attempt.started_at = timezone.now()
        attempt.save(
            update_fields=[
                "status",
                "started_at",
                "duration_seconds",
                "total_questions",
            ]
        )
        attempt.refresh_from_db()

    return attempt


def submit_attempt(*, attempt_id: UUID) -> ExamAttempt:
    try:
        attempt = get_exam_attempt_by_id(attempt_id=attempt_id)
    except ExamAttempt.DoesNotExist:
        raise ExamAttemptNotFoundError(str(attempt_id))

    _validate_attempt_transition(attempt.status, "submitted")

    if attempt.status != "in_progress":
        raise InvalidAttemptTransitionError(attempt.status, "submitted")

    with transaction.atomic():
        from django.utils import timezone

        attempt.status = "submitted"
        attempt.submitted_at = timezone.now()

        if attempt.started_at:
            elapsed = (
                attempt.submitted_at - attempt.started_at
            ).total_seconds()
            attempt.time_taken_seconds = int(elapsed)

        attempt.save(
            update_fields=[
                "status",
                "submitted_at",
                "time_taken_seconds",
            ]
        )
        attempt.refresh_from_db()

    return attempt


def score_attempt(*, attempt_id: UUID) -> ExamAttempt:
    try:
        attempt = get_exam_attempt_by_id(attempt_id=attempt_id)
    except ExamAttempt.DoesNotExist:
        raise ExamAttemptNotFoundError(str(attempt_id))

    _validate_attempt_transition(attempt.status, "scored")

    with transaction.atomic():
        answers = list(
            attempt.answers.select_related("question").all()
        )
        correct = sum(1 for a in answers if a.is_correct)
        answered = sum(
            1
            for a in answers
            if a.state in ("answered", "answered_marked")
        )
        incorrect = answered - correct
        skipped = attempt.total_questions - answered

        attempt.correct = correct
        attempt.incorrect = incorrect
        attempt.skipped = skipped
        attempt.status = "scored"

        if attempt.total_questions > 0:
            attempt.accuracy = Decimal(
                str(round(correct / answered * 100, 2))
            ) if answered > 0 else Decimal("0")

        if attempt.mock_test and attempt.mock_test_id:
            total_marks = sum(
                Decimal(str(q.marks))
                for q in attempt.mock_test.questions.select_related("question").all()
            )
            attempt.max_score = total_marks
            attempt.score = Decimal(str(correct)) * Decimal("1")  # assumes +1 per correct

        attempt.save(
            update_fields=[
                "correct",
                "incorrect",
                "skipped",
                "accuracy",
                "score",
                "max_score",
                "status",
            ]
        )
        attempt.refresh_from_db()

    return attempt


# ── User Answers ──────────────────────────────────────────────────────────


def save_answer(
    *,
    attempt_id: UUID,
    question_id: UUID,
    selected_option_id: UUID | None = None,
    state: str = "answered",
    time_spent_seconds: int = 0,
) -> UserAnswer:
    try:
        attempt = get_exam_attempt_by_id(attempt_id=attempt_id)
    except ExamAttempt.DoesNotExist:
        raise ExamAttemptNotFoundError(str(attempt_id))

    if attempt.status != "in_progress":
        raise AttemptAlreadySubmittedError(str(attempt_id))

    try:
        question = get_question_by_id(question_id=question_id)
    except Question.DoesNotExist:
        raise QuestionNotFoundError(str(question_id))

    from django.utils import timezone

    with transaction.atomic():
        answer, created = UserAnswer.objects.update_or_create(
            attempt=attempt,
            question=question,
            defaults={
                "selected_option_id": selected_option_id,
                "state": state,
                "is_correct": None,
                "time_spent_seconds": time_spent_seconds,
                "answered_at": timezone.now(),
            },
        )

        if selected_option_id:
            from questions.models import QuestionOption

            try:
                option = QuestionOption.objects.get(id=selected_option_id)
                answer.is_correct = option.is_correct and option.question_id == question_id
            except QuestionOption.DoesNotExist:
                answer.is_correct = None

            answer.save(
                update_fields=["is_correct"]
            )

    return answer


def bulk_save_answers(
    *,
    attempt_id: UUID,
    answers: list[dict],
) -> list[UserAnswer]:
    results: list[UserAnswer] = []
    for answer_data in answers:
        result = save_answer(attempt_id=attempt_id, **answer_data)
        results.append(result)
    return results
