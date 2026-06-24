from django.db.models import QuerySet

from cms.models import CMSPage
from cms.models.page import (
    PAGE_TYPE_GUIDE,
    PAGE_TYPE_PAGE,
    STATUS_PUBLISHED,
)

# Default locale when the request does not specify one (PRD v4 §4.1).
DEFAULT_LOCALE = "as"


def get_published_page_by_slug(*, slug: str, locale: str) -> CMSPage:
    """Return a single published generic page for (slug, locale).

    Guides live at /guides/<slug>; this resolves only `page`-type content so the
    two surfaces never serve the same slug. Raises CMSPage.DoesNotExist if there
    is no published page for that pair — the view maps this to a 404. Blocks are
    prefetched in sort order.
    """
    return (
        CMSPage.objects.filter(
            status=STATUS_PUBLISHED, page_type=PAGE_TYPE_PAGE
        )
        .prefetch_related("blocks")
        .get(slug=slug, locale=locale)
    )


def list_published_pages() -> QuerySet[CMSPage]:
    """All published generic pages (used for the /content sitemap entries)."""
    return CMSPage.objects.filter(
        status=STATUS_PUBLISHED, page_type=PAGE_TYPE_PAGE
    ).order_by("slug")


def list_published_guides(*, locale: str) -> QuerySet[CMSPage]:
    """Published study guides for a locale, ordered for the guide index (T45).

    Ordered by category then title so the frontend can group cards by category
    without re-sorting. No blocks are loaded — the index only needs card fields.
    """
    return CMSPage.objects.filter(
        status=STATUS_PUBLISHED, page_type=PAGE_TYPE_GUIDE, locale=locale
    ).order_by("category", "title")


def get_published_guide_by_slug(*, slug: str, locale: str) -> CMSPage:
    """Return a single published guide for (slug, locale) with ordered blocks.

    Raises CMSPage.DoesNotExist for drafts, unknown slugs, or non-guide pages —
    the view maps this to a 404.
    """
    return (
        CMSPage.objects.filter(
            status=STATUS_PUBLISHED, page_type=PAGE_TYPE_GUIDE
        )
        .prefetch_related("blocks")
        .get(slug=slug, locale=locale)
    )


def list_related_guides(*, guide: CMSPage, limit: int = 3) -> QuerySet[CMSPage]:
    """Other published guides related to `guide` (same locale), capped at `limit`.

    Prefers guides sharing the same non-empty category; if none exist (or the
    guide has no category) it falls back to other guides in the same locale.
    Simple by design (T45) — no scoring or vector similarity.
    """
    siblings = CMSPage.objects.filter(
        status=STATUS_PUBLISHED,
        page_type=PAGE_TYPE_GUIDE,
        locale=guide.locale,
    ).exclude(pk=guide.pk)

    if guide.category:
        same_category = siblings.filter(category=guide.category)
        if same_category.exists():
            return same_category.order_by("title")[:limit]

    return siblings.order_by("title")[:limit]
