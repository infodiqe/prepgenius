from django.urls import path

from content_review.api.views import (
    ApproveQuestion,
    ClaimQuestion,
    PublishQuestion,
    QuestionApprovalList,
    QuestionReviewHistory,
    RejectQuestion,
    ReleaseClaim,
    RequestSmeReview,
    SmeApproveQuestion,
    SubmitQuestion,
)

app_name = "content_review"

urlpatterns = [
    path(
        "questions/<uuid:question_pk>/claim/",
        ClaimQuestion.as_view(),
        name="claim-question",
    ),
    path(
        "questions/<uuid:question_pk>/release-claim/",
        ReleaseClaim.as_view(),
        name="release-claim",
    ),
    path(
        "questions/<uuid:question_pk>/reviews/",
        QuestionReviewHistory.as_view(),
        name="question-review-history",
    ),
    path(
        "questions/<uuid:question_pk>/approvals/",
        QuestionApprovalList.as_view(),
        name="question-approval-list",
    ),
    # Workflow transitions
    path(
        "questions/<uuid:question_pk>/submit/",
        SubmitQuestion.as_view(),
        name="question-submit",
    ),
    path(
        "questions/<uuid:question_pk>/approve/",
        ApproveQuestion.as_view(),
        name="question-approve",
    ),
    path(
        "questions/<uuid:question_pk>/sme-approve/",
        SmeApproveQuestion.as_view(),
        name="question-sme-approve",
    ),
    path(
        "questions/<uuid:question_pk>/request-sme/",
        RequestSmeReview.as_view(),
        name="question-request-sme",
    ),
    path(
        "questions/<uuid:question_pk>/reject/",
        RejectQuestion.as_view(),
        name="question-reject",
    ),
    path(
        "questions/<uuid:question_pk>/publish/",
        PublishQuestion.as_view(),
        name="question-publish",
    ),
]
