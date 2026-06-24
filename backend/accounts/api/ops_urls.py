"""Operations User 360 routes — OPS-BE-01. Mounted under /api/v1/ops/."""
from django.urls import path

from accounts.api.ops_views import (
    OpsUserDetailView,
    OpsUserListView,
    OpsUserSummaryView,
)

urlpatterns = [
    path("users/", OpsUserListView.as_view(), name="ops-users-list"),
    path(
        "users/<uuid:user_id>/",
        OpsUserDetailView.as_view(),
        name="ops-users-detail",
    ),
    path(
        "users/<uuid:user_id>/summary/",
        OpsUserSummaryView.as_view(),
        name="ops-users-summary",
    ),
]
