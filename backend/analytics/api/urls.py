"""Analytics API URL patterns. Registered under /api/v1/ in config.api_router."""
from django.urls import path

from analytics.api.views import DashboardView

app_name = "analytics"

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
]
