from uuid import UUID

from django.core.exceptions import ObjectDoesNotExist
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserRole
from common.permissions import (
    CanApproveReviewerLevel,
    CanApproveSmeLevel,
    CanClaimQuestion,
    CanPublishContent,
    CanReleaseClaim,
    CanRejectContent,
    CanRequestSmeReview,
    CanViewContentReview,
)

from content_review.api.serializers import (
    ClaimQuestionSerializer,
    ContentApprovalReadSerializer,
    ContentReviewReadSerializer,
    ReleaseClaimSerializer,
    ReviewActionSerializer,
)
from content_review.selectors import (
    list_approvals_for_question,
    list_reviews_for_question,
)

from questions.exceptions import (
    ApprovalRequiredForPublishError,
    InvalidReviewTransitionError,
    QuestionAlreadyClaimedError,
    QuestionDomainError,
    QuestionNotClaimedError,
    QuestionNotFoundError,
)
from questions.selectors.question_selectors import get_question_by_id
from questions.services.question_services import (
    claim_question_for_review,
    release_claim,
    update_question_review_status,
)

_CONTENT_ROLE_PRIORITY = [
    "platform_admin",
    "content_manager",
    "content_reviewer",
    "sme",
]


def _get_actor_role(user):
    roles = set(
        UserRole.objects.filter(user=user).values_list("role__name", flat=True)
    )
    for role in _CONTENT_ROLE_PRIORITY:
        if role in roles:
            return role
    return None


class ContentReviewBaseView(APIView):
    def handle_exception(self, exc):
        if isinstance(exc, QuestionDomainError):
            if isinstance(exc, QuestionNotFoundError):
                exc = NotFound(str(exc))
            else:
                exc = ValidationError(str(exc))
        elif isinstance(exc, ObjectDoesNotExist):
            exc = NotFound(str(exc))
        return super().handle_exception(exc)


@extend_schema_view(
    post=extend_schema(
        summary="Claim question for review",
        description="Claim a question to signal it is being reviewed. "
        "Prevents double-claim. "
        "Requires content_reviewer, content_manager, or platform_admin role.",
        request=ClaimQuestionSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
            409: OpenApiResponse(description="Already claimed"),
        },
    ),
)
class ClaimQuestion(ContentReviewBaseView):
    permission_classes = [CanClaimQuestion]

    def post(self, request, question_pk: UUID):
        question = get_question_by_id(question_id=question_pk)
        try:
            claim_question_for_review(
                question_id=question.id, user_id=request.user.id
            )
        except QuestionAlreadyClaimedError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_409_CONFLICT
            )
        return Response(status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Release claim on question",
        description="Release a previously claimed question so others can claim it. "
        "Content reviewers can only release their own claims. "
        "Content managers and platform admins can release any claim.",
        request=ReleaseClaimSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied or not claim owner"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class ReleaseClaim(ContentReviewBaseView):
    permission_classes = [CanViewContentReview]

    def post(self, request, question_pk: UUID):
        question = get_question_by_id(question_id=question_pk)

        broad_release = CanReleaseClaim().has_permission(request, self)
        is_owner = question.claimed_by_id == request.user.id

        if not broad_release and not is_owner and question.claimed_by_id is not None:
            self.permission_denied(
                request,
                message="You do not have permission to release this claim.",
            )

        user_id = (
            question.claimed_by_id if broad_release else request.user.id
        )
        try:
            release_claim(question_id=question.id, user_id=user_id)
        except QuestionNotClaimedError:
            pass
        return Response(status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        summary="List review history for a question",
        description=(
            "Retrieve all content review entries for a question, "
            "ordered by most recent first."
        ),
        responses={
            200: ContentReviewReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class QuestionReviewHistory(ContentReviewBaseView):
    permission_classes = [CanViewContentReview]

    def get(self, request, question_pk: UUID):
        reviews = list_reviews_for_question(question_id=question_pk)
        return Response(
            ContentReviewReadSerializer(reviews, many=True).data
        )


@extend_schema_view(
    get=extend_schema(
        summary="List approvals for a question",
        description=(
            "Retrieve all content approval records for a question, "
            "ordered by most recent first."
        ),
        responses={
            200: ContentApprovalReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class QuestionApprovalList(ContentReviewBaseView):
    permission_classes = [CanViewContentReview]

    def get(self, request, question_pk: UUID):
        approvals = list_approvals_for_question(question_id=question_pk)
        return Response(
            ContentApprovalReadSerializer(approvals, many=True).data
        )


# ═══════════════════════════════════════════════════════════════════════
# WORKFLOW TRANSITIONS
# ═══════════════════════════════════════════════════════════════════════


class _BaseWorkflowView(ContentReviewBaseView):
    review_status: str
    # P0-2: the approval level this endpoint is authorised to mint. The reviewer
    # /approve/ endpoint sets "reviewer"; the SME /sme-approve/ endpoint sets
    # "sme". The service rejects a level that doesn't match the transition, so a
    # reviewer-authority action can never produce an SME-level approval.
    approval_level: str | None = None

    def post(self, request, question_pk: UUID):
        serializer = ReviewActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            update_question_review_status(
                question_id=question_pk,
                review_status=self.review_status,
                actor_id=request.user.id,
                actor_role=_get_actor_role(request.user),
                comment=serializer.validated_data.get("comment", ""),
                approval_level=self.approval_level,
            )
        except InvalidReviewTransitionError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        except ApprovalRequiredForPublishError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        summary="Submit question for review",
        description="Move a question from draft to in_review. "
        "Requires content_reviewer, content_manager, or platform_admin role.",
        request=ReviewActionSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Invalid transition or validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class SubmitQuestion(_BaseWorkflowView):
    review_status = "in_review"
    permission_classes = [CanClaimQuestion]


@extend_schema_view(
    post=extend_schema(
        summary="Approve question",
        description="Approve a question (reviewer level). "
        "Moves from in_review to approved and creates a ContentApproval. "
        "Requires content_reviewer, content_manager, or platform_admin role.",
        request=ReviewActionSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Invalid transition or validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class ApproveQuestion(_BaseWorkflowView):
    review_status = "approved"
    approval_level = "reviewer"
    permission_classes = [CanApproveReviewerLevel]


@extend_schema_view(
    post=extend_schema(
        summary="SME-approve question",
        description="Approve a question at SME level. "
        "Moves from sme_review to approved and creates an SME ContentApproval. "
        "Requires sme or platform_admin role.",
        request=ReviewActionSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Invalid transition or validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class SmeApproveQuestion(_BaseWorkflowView):
    review_status = "approved"
    approval_level = "sme"
    permission_classes = [CanApproveSmeLevel]


@extend_schema_view(
    post=extend_schema(
        summary="Request SME review",
        description="Escalate a question from in_review to sme_review. "
        "Requires content_reviewer, content_manager, or platform_admin role.",
        request=ReviewActionSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Invalid transition or validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class RequestSmeReview(_BaseWorkflowView):
    review_status = "sme_review"
    permission_classes = [CanRequestSmeReview]


@extend_schema_view(
    post=extend_schema(
        summary="Reject question",
        description="Reject a question and return it to draft/in_review. "
        "Valid from any reviewable state. "
        "Requires content_reviewer, sme, content_manager, or platform_admin role.",
        request=ReviewActionSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Invalid transition or validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class RejectQuestion(_BaseWorkflowView):
    review_status = "rejected"
    permission_classes = [CanRejectContent]


@extend_schema_view(
    post=extend_schema(
        summary="Publish question",
        description="Publish an approved question. Requires at least one "
        "ContentApproval to exist. "
        "Requires content_manager or platform_admin role.",
        request=ReviewActionSerializer,
        responses={
            200: None,
            400: OpenApiResponse(description="Missing approval or invalid transition"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class PublishQuestion(_BaseWorkflowView):
    review_status = "published"
    permission_classes = [CanPublishContent]
