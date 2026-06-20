from django.db.models import QuerySet

from cms.models import CMSPage
from cms.models.page import STATUS_PUBLISHED

# Default locale when the request does not specify one (PRD v4 §4.1).
DEFAULT_LOCALE = "as"


def get_published_page_by_slug(*, slug: str, locale: str) -> CMSPage:
    """Return a single published page for (slug, locale).

    Raises CMSPage.DoesNotExist if there is no published page for that pair —
    the view maps this to a 404. Blocks are prefetched in sort order.
    """
    return (
        CMSPage.objects.filter(status=STATUS_PUBLISHED)
        .prefetch_related("blocks")
        .get(slug=slug, locale=locale)
    )


def list_published_pages() -> QuerySet[CMSPage]:
    """All published pages (used for the sitemap)."""
    return CMSPage.objects.filter(status=STATUS_PUBLISHED).order_by("slug")
