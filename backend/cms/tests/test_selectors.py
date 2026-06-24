import pytest

from cms.models import CMSPage
from cms.selectors import (
    get_published_guide_by_slug,
    get_published_page_by_slug,
    list_published_guides,
    list_published_pages,
    list_related_guides,
)
from .factories import CMSGuideFactory, CMSPageFactory, DraftCMSPageFactory

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


class TestGetPublishedPageBySlug_GuideIsolation:
    def test_guide_not_resolved_as_generic_page(self):
        # A guide must not be reachable through the generic /content surface.
        CMSGuideFactory(slug="how-to", locale="as", status="published")
        with pytest.raises(CMSPage.DoesNotExist):
            get_published_page_by_slug(slug="how-to", locale="as")


class TestListPublishedPages:
    def test_excludes_drafts(self):
        CMSPageFactory(slug="pub", status="published")
        DraftCMSPageFactory(slug="draft")
        slugs = {p.slug for p in list_published_pages()}
        assert slugs == {"pub"}

    def test_excludes_guides(self):
        CMSPageFactory(slug="page", status="published")
        CMSGuideFactory(slug="guide", status="published")
        slugs = {p.slug for p in list_published_pages()}
        assert slugs == {"page"}


class TestListPublishedGuides:
    def test_returns_only_published_guides_for_locale(self):
        CMSGuideFactory(slug="g-as", locale="as", status="published")
        CMSGuideFactory(slug="g-en", locale="en", status="published")
        CMSPageFactory(slug="plain", locale="as", status="published")
        DraftCMSPageFactory(slug="g-draft", locale="as", page_type="guide")
        slugs = {g.slug for g in list_published_guides(locale="as")}
        assert slugs == {"g-as"}

    def test_ordered_by_category_then_title(self):
        CMSGuideFactory(slug="b", title="Beta", category="CTET", locale="as")
        CMSGuideFactory(slug="a", title="Alpha", category="CTET", locale="as")
        CMSGuideFactory(slug="z", title="Zeta", category="Assam TET", locale="as")
        titles = [g.title for g in list_published_guides(locale="as")]
        assert titles == ["Zeta", "Alpha", "Beta"]


class TestGetPublishedGuideBySlug:
    def test_returns_published_guide(self):
        CMSGuideFactory(slug="prep", locale="as", status="published")
        guide = get_published_guide_by_slug(slug="prep", locale="as")
        assert guide.slug == "prep"

    def test_generic_page_not_resolved_as_guide(self):
        CMSPageFactory(slug="about", locale="as", status="published")
        with pytest.raises(CMSPage.DoesNotExist):
            get_published_guide_by_slug(slug="about", locale="as")

    def test_draft_raises(self):
        DraftCMSPageFactory(slug="hidden", locale="as", page_type="guide")
        with pytest.raises(CMSPage.DoesNotExist):
            get_published_guide_by_slug(slug="hidden", locale="as")


class TestListRelatedGuides:
    def test_prefers_same_category_and_excludes_self(self):
        guide = CMSGuideFactory(slug="main", category="CTET", locale="as")
        CMSGuideFactory(slug="sib", category="CTET", locale="as")
        CMSGuideFactory(slug="other", category="Assam TET", locale="as")
        slugs = {g.slug for g in list_related_guides(guide=guide)}
        assert slugs == {"sib"}

    def test_falls_back_to_other_guides_when_no_category_match(self):
        guide = CMSGuideFactory(slug="solo", category="Rare", locale="as")
        CMSGuideFactory(slug="x", category="CTET", locale="as")
        CMSGuideFactory(slug="y", category="Assam TET", locale="as")
        slugs = {g.slug for g in list_related_guides(guide=guide)}
        assert slugs == {"x", "y"}

    def test_respects_limit(self):
        guide = CMSGuideFactory(slug="hub", category="CTET", locale="as")
        for i in range(5):
            CMSGuideFactory(slug=f"r{i}", category="CTET", locale="as")
        assert len(list_related_guides(guide=guide, limit=2)) == 2

    def test_excludes_other_locales(self):
        guide = CMSGuideFactory(slug="main", category="CTET", locale="as")
        CMSGuideFactory(slug="en-sib", category="CTET", locale="en")
        assert list(list_related_guides(guide=guide)) == []
