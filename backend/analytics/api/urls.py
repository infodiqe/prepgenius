"""Analytics API URL patterns. Registered under /api/v1/ in config.api_router."""
from django.urls import path

from analytics.api.views import (
    DashboardView,
    TopicPerformanceView,
    ReadinessView,
    AttemptTrendView,
    SectionTrendView,
    ReadinessTrendView,
)

app_name = "analytics"

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    # This app is included at "" in the api router, so `dashboard/` lives at
    # /api/v1/dashboard/ and the paths below under /api/v1/analytics/.
    path(
        "analytics/topic-performance/",
        TopicPerformanceView.as_view(),
        name="topic-performance",
    ),
    path(
        "analytics/readiness/",
        ReadinessView.as_view(),
        name="readiness",
    ),
    # Trends & History (T24)
    path(
        "analytics/trends/attempts/",
        AttemptTrendView.as_view(),
        name="trends-attempts",
    ),
    path(
        "analytics/trends/sections/",
        SectionTrendView.as_view(),
        name="trends-sections",
    ),
    path(
        "analytics/trends/readiness/",
        ReadinessTrendView.as_view(),
        name="trends-readiness",
    ),
]
