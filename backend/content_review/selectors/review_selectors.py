from uuid import UUID

from django.db.models import QuerySet

from content_review.models import ContentApproval, ContentReview


def get_review_by_id(*, review_id: int) -> ContentReview:
    return ContentReview.objects.select_related(
        "question", "actor"
    ).get(id=review_id)


def get_approval_by_id(*, approval_id: UUID) -> ContentApproval:
    return ContentApproval.objects.select_related(
        "question", "approver"
    ).get(id=approval_id)


def list_reviews_for_question(
    *, question_id: UUID
) -> QuerySet[ContentReview]:
    return ContentReview.objects.filter(
        question_id=question_id
    ).select_related("actor").order_by("-created_at")


def list_approvals_for_question(
    *, question_id: UUID
) -> QuerySet[ContentApproval]:
    return ContentApproval.objects.filter(
        question_id=question_id
    ).select_related("approver").order_by("-approved_at")
