from uuid import UUID

from django.db.models import Prefetch, QuerySet

from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer

_QUESTIONS_PREFETCH = Prefetch(
    "questions",
    queryset=MockTestQuestion.objects.order_by("position").select_related(
        "question__subtopic__topic__subject"
    ),
)


def get_mock_test_by_id(*, mock_test_id: UUID) -> MockTest:
    return (
        MockTest.objects.select_related("exam", "created_by")
        .prefetch_related(_QUESTIONS_PREFETCH)
        .get(id=mock_test_id)
    )


def get_mock_test_question_by_id(
    *, mock_test_question_id: UUID
) -> MockTestQuestion:
    return MockTestQuestion.objects.select_related(
        "mock_test", "question"
    ).get(id=mock_test_question_id)


def get_exam_attempt_by_id(*, attempt_id: UUID) -> ExamAttempt:
    return (
        ExamAttempt.objects.select_related(
            "exam", "mock_test", "user"
        )
        .prefetch_related(
            Prefetch(
                "answers",
                queryset=UserAnswer.objects.select_related(
                    "question", "selected_option"
                ).order_by("created_at"),
            )
        )
        .get(id=attempt_id)
    )


def get_user_answer_by_id(*, answer_id: UUID) -> UserAnswer:
    return UserAnswer.objects.select_related(
        "attempt", "question", "selected_option"
    ).get(id=answer_id)


def list_mock_tests(
    *,
    exam_id: UUID | None = None,
    is_published: bool | None = None,
) -> QuerySet[MockTest]:
    qs = MockTest.objects.select_related("exam", "created_by")
    if exam_id is not None:
        qs = qs.filter(exam_id=exam_id)
    if is_published is not None:
        qs = qs.filter(is_published=is_published)
    return qs.order_by("-created_at")


def list_mock_test_questions(
    *, mock_test_id: UUID
) -> QuerySet[MockTestQuestion]:
    return (
        MockTestQuestion.objects.filter(mock_test_id=mock_test_id)
        .select_related("question__subtopic__topic__subject")
        .order_by("position")
    )


def list_attempts(
    *,
    user_id: UUID | None = None,
    exam_id: UUID | None = None,
    status: str | None = None,
) -> QuerySet[ExamAttempt]:
    qs = ExamAttempt.objects.select_related(
        "exam", "mock_test"
    )
    if user_id is not None:
        qs = qs.filter(user_id=user_id)
    if exam_id is not None:
        qs = qs.filter(exam_id=exam_id)
    if status is not None:
        qs = qs.filter(status=status)
    return qs.order_by("-created_at")


def list_answers_for_attempt(
    *, attempt_id: UUID
) -> QuerySet[UserAnswer]:
    return (
        UserAnswer.objects.filter(attempt_id=attempt_id)
        .select_related("question", "selected_option")
        .order_by("created_at")
    )
