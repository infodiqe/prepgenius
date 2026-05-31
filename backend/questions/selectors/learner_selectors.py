from uuid import UUID

from django.db.models import Prefetch, QuerySet

from questions.models import Question, QuestionOption

__all__ = [
    "get_published_question_by_id",
    "list_published_questions",
    "list_published_questions_for_subtopic",
]


def get_published_question_by_id(*, question_id: UUID) -> Question:
    return (
        Question.objects.filter(id=question_id, review_status="published")
        .select_related("exam", "subtopic__topic__subject__exam", "verified_by")
        .prefetch_related(
            Prefetch(
                "options",
                queryset=QuestionOption.objects.order_by("position"),
            )
        )
        .get()
    )


def list_published_questions(
    *, exam_id: UUID | None = None
) -> QuerySet[Question]:
    qs = (
        Question.objects.filter(review_status="published")
        .select_related("exam", "subtopic__topic__subject", "verified_by")
        .prefetch_related(
            Prefetch(
                "options",
                queryset=QuestionOption.objects.order_by("position"),
            )
        )
    )
    if exam_id is not None:
        qs = qs.filter(exam_id=exam_id)
    return qs.order_by(
        "subtopic__topic__subject__position", "subtopic__position"
    )


def list_published_questions_for_subtopic(
    *, subtopic_id: UUID
) -> QuerySet[Question]:
    return (
        Question.objects.filter(
            subtopic_id=subtopic_id, review_status="published"
        )
        .select_related("exam", "subtopic__topic__subject", "verified_by")
        .prefetch_related(
            Prefetch(
                "options",
                queryset=QuestionOption.objects.order_by("position"),
            )
        )
        .order_by("-created_at")
    )
