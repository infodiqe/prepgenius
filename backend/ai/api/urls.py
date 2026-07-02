from django.urls import path

from ai.api.views import (
    DiscardDraftView,
    DraftDetailView,
    DraftListView,
    GenerateDraftView,
    GenerateQuestionsView,
    ImportDraftView,
    JobDetailView,
    JobListView,
)

app_name = "ai"

urlpatterns = [
    path(
        "questions/generate/",
        GenerateQuestionsView.as_view(),
        name="questions-generate",
    ),
    path(
        "questions/generate-draft/",
        GenerateDraftView.as_view(),
        name="questions-generate-draft",
    ),
    path(
        "questions/drafts/",
        DraftListView.as_view(),
        name="draft-list",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/",
        DraftDetailView.as_view(),
        name="draft-detail",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/import/",
        ImportDraftView.as_view(),
        name="draft-import",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/discard/",
        DiscardDraftView.as_view(),
        name="draft-discard",
    ),
    path("jobs/", JobListView.as_view(), name="job-list"),
    path("jobs/<uuid:job_id>/", JobDetailView.as_view(), name="job-detail"),
]
