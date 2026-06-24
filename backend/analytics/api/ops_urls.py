"""Operations analytics routes — OPS-BE-03. Mounted under /api/v1/ops/."""
from django.urls import path

from analytics.api.ops_views import (
    OpsAnalyticsContentView,
    OpsAnalyticsCreditsView,
    OpsAnalyticsOverviewView,
    OpsAnalyticsReadinessView,
    OpsAnalyticsReviewView,
)

urlpatterns = [
    path(
        "analytics/overview/",
        OpsAnalyticsOverviewView.as_view(),
        name="ops-analytics-overview",
    ),
    path(
        "analytics/readiness/",
        OpsAnalyticsReadinessView.as_view(),
        name="ops-analytics-readiness",
    ),
    path(
        "analytics/content/",
        OpsAnalyticsContentView.as_view(),
        name="ops-analytics-content",
    ),
    path(
        "analytics/review/",
        OpsAnalyticsReviewView.as_view(),
        name="ops-analytics-review",
    ),
    path(
        "analytics/credits/",
        OpsAnalyticsCreditsView.as_view(),
        name="ops-analytics-credits",
    ),
]
