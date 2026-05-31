"""Central API v1 router. Each app registers its own router here when implemented."""
from django.urls import include, path

urlpatterns: list = [
    path("auth/", include("accounts.api.urls")),
    path("", include("exams.api.urls")),
    # path("questions/", include("questions.api.urls")),
    # path("attempts/", include("attempts.api.urls")),
    # path("analytics/", include("analytics.api.urls")),
    # path("ai/", include("ai.api.urls")),
    # path("credits/", include("credits.api.urls")),
    # path("notifications/", include("notifications.api.urls")),
    # path("institutions/", include("institutions.api.urls")),
    # path("content-review/", include("content_review.api.urls")),
]
