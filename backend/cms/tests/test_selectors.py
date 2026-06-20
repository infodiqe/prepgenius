import pytest

from cms.models import CMSPage
from cms.selectors import get_published_page_by_slug, list_published_pages
from .factories import CMSPageFactory, DraftCMSPageFactory

pytestmark = pytest.mark.django_db


class TestGetPublishedPageBySlug:
    def test_returns_published_page(self):
        CMSPageFactory(slug="ok", locale="as", status="published")
        page = get_published_page_by_slug(slug="ok", locale="as")
        assert page.slug == "ok"

    def test_draft_raises(self):
        DraftCMSPageFactory(slug="hidden", locale="as")
        with pytest.raises(CMSPage.DoesNotExist):
            get_published_page_by_slug(slug="hidden", locale="as")

    def test_wrong_locale_raises(self):
        CMSPageFactory(slug="multi", locale="as", status="published")
        with pytest.raises(CMSPage.DoesNotExist):
            get_published_page_by_slug(slug="multi", locale="en")


class TestListPublishedPages:
    def test_excludes_drafts(self):
        CMSPageFactory(slug="pub", status="published")
        DraftCMSPageFactory(slug="draft")
        slugs = {p.slug for p in list_published_pages()}
        assert slugs == {"pub"}
