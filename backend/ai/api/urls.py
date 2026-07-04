from django.urls import path

from ai.api.views import (
    DiscardDraftView,
    DraftDetailView,
    DraftListView,
    DraftRegenerationListView,
    DraftVersionCompareView,
    GenerateDraftView,
    GenerateQuestionsView,
    ImportDraftView,
    JobDetailView,
    JobListView,
    RegenerateDraftView,
    ReviewActionsView,
    ReviewImproveView,
    ReviewRecommendationsView,
    RollbackDraftView,
    TaxonomyAcceptView,
    TaxonomySuggestionsView,
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
    path(
        "questions/drafts/<uuid:draft_id>/regenerate/",
        RegenerateDraftView.as_view(),
        name="draft-regenerate",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/rollback/",
        RollbackDraftView.as_view(),
        name="draft-rollback",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/regenerations/",
        DraftRegenerationListView.as_view(),
        name="draft-regenerations",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/compare/",
        DraftVersionCompareView.as_view(),
        name="draft-compare",
    ),
    # ── AI Content Review Assistant (Sprint-6B-04) ───────────────────────────
    path(
        "questions/drafts/review/actions/",
        ReviewActionsView.as_view(),
        name="review-actions",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/review/recommendations/",
        ReviewRecommendationsView.as_view(),
        name="review-recommendations",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/review/improve/",
        ReviewImproveView.as_view(),
        name="review-improve",
    ),
    # ── AI Taxonomy Resolution & Intelligent Import (Sprint-6C-01) ───────────
    path(
        "questions/drafts/<uuid:draft_id>/taxonomy-suggestions/",
        TaxonomySuggestionsView.as_view(),
        name="taxonomy-suggestions",
    ),
    path(
        "questions/drafts/<uuid:draft_id>/taxonomy-accept/",
        TaxonomyAcceptView.as_view(),
        name="taxonomy-accept",
    ),
    path("jobs/", JobListView.as_view(), name="job-list"),
    path("jobs/<uuid:job_id>/", JobDetailView.as_view(), name="job-detail"),
]
