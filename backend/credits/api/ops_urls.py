"""Credits Operations routes — OPS-BE-02. Mounted under /api/v1/ops/."""
from django.urls import path

from credits.api.ops_views import OpsUserCreditsAdjustView, OpsUserCreditsView

urlpatterns = [
    path(
        "users/<uuid:user_id>/credits/",
        OpsUserCreditsView.as_view(),
        name="ops-user-credits",
    ),
    path(
        "users/<uuid:user_id>/credits/adjust/",
        OpsUserCreditsAdjustView.as_view(),
        name="ops-user-credits-adjust",
    ),
]
