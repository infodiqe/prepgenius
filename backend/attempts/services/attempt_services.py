from decimal import Decimal
from uuid import UUID

from django.db import transaction
from django.utils import timezone

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
_DEFAULT_CORRECT_MARKS = Decimal("1")
_DEFAULT_NEGATIVE_MARKS = Decimal("0")


def _validate_attempt_transition(from_status: str, to_status: str) -> None:
    allowed = _VALID_ATTEMPT_TRANSITIONS.get(from_status, [])
    if to_status not in allowed:
        raise InvalidAttemptTransitionError(from_status, to_status)


def _decimal(value, default: Decimal) -> Decimal:
    if value is None:
        return default
    return Decimal(str(value))


def _marks_per_correct(exam_rules: dict) -> Decimal:
    if "marks_per_question" in exam_rules:
        return _decimal(exam_rules.get("marks_per_question"), _DEFAULT_CORRECT_MARKS)

    total_marks = exam_rules.get("total_marks")
    total_questions = exam_rules.get("total_questions")
    if total_marks is not None and total_questions:
        return _decimal(total_marks, _DEFAULT_CORRECT_MARKS) / _decimal(
            total_questions, _DEFAULT_CORRECT_MARKS
        )

    return _DEFAULT_CORRECT_MARKS


def _negative_marks(exam_rules: dict) -> Decimal:
    negative_marking = exam_rules.get("negative_marking", False)
    if negative_marking is False:
        return _DEFAULT_NEGATIVE_MARKS
    if isinstance(negative_marking, dict):
        if not negative_marking.get("enabled", True):
            return _DEFAULT_NEGATIVE_MARKS
        return _decimal(
            negative_marking.get("marks")
            or negative_marking.get("penalty")
            or negative_marking.get("marks_per_wrong"),
            _DEFAULT_NEGATIVE_MARKS,
        )
    return _decimal(
        exam_rules.get("negative_marks")
        or exam_rules.get("negative_marks_per_question")
        or exam_rules.get("penalty_per_wrong"),
        _DEFAULT_NEGATIVE_MARKS,
    )


def _mock_question_marks(attempt: ExamAttempt) -> dict[UUID, Decimal]:
    if not attempt.mock_test_id:
        return {}
    return {
        item.question_id: Decimal(str(item.marks))
        for item in attempt.mock_test.questions.select_related("question").all()
    }


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
    elif attempt.duration_seconds is None:
        duration_minutes = attempt.exam.exam_rules.get("duration_minutes")
        if duration_minutes is not None:
            attempt.duration_seconds = int(duration_minutes) * 60

    with transaction.atomic():
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
        exam_rules = attempt.exam.exam_rules or {}
        default_correct_marks = _marks_per_correct(exam_rules)
        negative_marks = _negative_marks(exam_rules)
        mock_marks = _mock_question_marks(attempt)

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

        score = Decimal("0")
        for answer in answers:
            if answer.state not in ("answered", "answered_marked"):
                continue
            question_marks = mock_marks.get(answer.question_id, default_correct_marks)
            if answer.is_correct is True:
                score += question_marks
            elif answer.is_correct is False:
                score -= negative_marks

        if mock_marks:
            attempt.max_score = sum(mock_marks.values())
        else:
            configured_total = exam_rules.get("total_marks")
            if configured_total is not None:
                attempt.max_score = _decimal(configured_total, Decimal("0"))
            else:
                attempt.max_score = Decimal(str(attempt.total_questions)) * default_correct_marks
        attempt.score = score

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


def submit_expired_attempts(*, now=None) -> int:
    now = now or timezone.now()
    submitted_count = 0
    expired_attempts = ExamAttempt.objects.filter(
        status="in_progress",
        started_at__isnull=False,
        duration_seconds__isnull=False,
    )

    for attempt in expired_attempts:
        elapsed = (now - attempt.started_at).total_seconds()
        if elapsed < attempt.duration_seconds:
            continue
        try:
            submit_attempt(attempt_id=attempt.id)
        except InvalidAttemptTransitionError:
            continue
        submitted_count += 1

    return submitted_count


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
