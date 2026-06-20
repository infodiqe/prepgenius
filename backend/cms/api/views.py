from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from cms.models import CMSPage
from cms.selectors import (
    DEFAULT_LOCALE,
    get_published_page_by_slug,
    list_published_pages,
)
from cms.serializers import CMSPageListSerializer, CMSPageSerializer


@extend_schema(
    summary="Get a published CMS page",
    description=(
        "Public, read-only. Returns a single published page (with ordered "
        "blocks) for the given slug and locale. Draft pages and unknown "
        "slug/locale pairs return 404."
    ),
    parameters=[
        OpenApiParameter(
            name="locale",
            description="Locale to resolve (defaults to 'as').",
            required=False,
            type=str,
        )
    ],
    responses=CMSPageSerializer,
)
class PublicCMSPageDetail(APIView):
    """GET /api/v1/cms/pages/<slug>/ — published, locale-aware, read-only."""

    permission_classes = [AllowAny]

    def get(self, request, slug: str):
        locale = request.query_params.get("locale") or DEFAULT_LOCALE
        try:
            page = get_published_page_by_slug(slug=slug, locale=locale)
        except CMSPage.DoesNotExist as exc:
            raise NotFound("CMS page not found.") from exc
        return Response(CMSPageSerializer(page).data)


@extend_schema(
    summary="List published CMS pages",
    description="Public, read-only. Minimal list of published pages for the sitemap.",
    responses=CMSPageListSerializer(many=True),
)
class PublicCMSPageList(APIView):
    """GET /api/v1/cms/pages/ — published pages (slug/locale/updated_at)."""

    permission_classes = [AllowAny]

    def get(self, request):
        pages = list_published_pages()
        return Response(CMSPageListSerializer(pages, many=True).data)
