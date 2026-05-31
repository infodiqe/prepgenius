from uuid import UUID

from django.db import transaction

from content_review.exceptions import (
    ContentApprovalAlreadyExistsError,
    ContentReviewQuestionRequiredError,
    ContentReviewQuestionNotFoundError,
)
from content_review.models import ContentApproval, ContentReview


def create_review_entry(
    *,
    question_id: UUID | None = None,
    ai_generated_question_id: UUID | None = None,
    actor_id: UUID | None = None,
    actor_role: str | None = None,
    action: str,
    from_status: str | None = None,
    to_status: str | None = None,
    comment: str | None = None,
) -> ContentReview:
    if question_id is None and ai_generated_question_id is None:
        raise ContentReviewQuestionRequiredError()

    with transaction.atomic():
        review = ContentReview.objects.create(
            question_id=question_id,
            ai_generated_question_id=ai_generated_question_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            from_status=from_status,
            to_status=to_status,
            comment=comment,
        )

    return review


def create_approval(
    *,
    question_id: UUID,
    approver_id: UUID | None = None,
    approval_level: str,
    note: str | None = None,
) -> ContentApproval:
    from questions.models import Question

    if not Question.objects.filter(id=question_id).exists():
        raise ContentReviewQuestionNotFoundError(str(question_id))

    with transaction.atomic():
        approval, created = ContentApproval.objects.get_or_create(
            question_id=question_id,
            approval_level=approval_level,
            defaults={
                "approver_id": approver_id,
                "note": note,
            },
        )
        if not created:
            raise ContentApprovalAlreadyExistsError(
                str(question_id), approval_level
            )

    return approval
