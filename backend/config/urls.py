"""Root URL configuration. All API routes are versioned under /api/v1/."""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # OpenAPI schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
    path("api/schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # v1 API — routers mounted by each app when implemented
    path("api/v1/", include("config.api_router")),
]

if settings.DEBUG and "debug_toolbar" in settings.INSTALLED_APPS:
    import debug_toolbar  # type: ignore[import-untyped]  # noqa: F811

    urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
