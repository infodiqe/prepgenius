import pytest

from cms.selectors import (
    get_published_guide_by_slug,
    get_published_page_by_slug,
    list_related_guides,
)
from cms.serializers import (
    CMSBlockSerializer,
    CMSGuideCardSerializer,
    CMSGuideDetailSerializer,
    CMSPageSerializer,
)
from .factories import CMSBlockFactory, CMSGuideFactory, CMSPageFactory

pytestmark = pytest.mark.django_db


class TestCMSBlockSerializer:
    def test_fields(self):
        block = CMSBlockFactory(block_type="hero", sort_order=3, content={"title": "T"})
        data = CMSBlockSerializer(block).data
        assert data == {"block_type": "hero", "sort_order": 3, "content": {"title": "T"}}


class TestCMSPageSerializer:
    def test_exposes_metadata_and_ordered_blocks(self):
        page = CMSPageFactory(slug="s", locale="as", status="published")
        CMSBlockFactory(page=page, block_type="cta", sort_order=1)
        CMSBlockFactory(page=page, block_type="hero", sort_order=0)

        data = CMSPageSerializer(get_published_page_by_slug(slug="s", locale="as")).data

        assert set(data.keys()) == {
            "slug",
            "title",
            "meta_title",
            "meta_description",
            "locale",
            "status",
            "published_at",
            "blocks",
        }
        assert [b["block_type"] for b in data["blocks"]] == ["hero", "cta"]


class TestCMSGuideCardSerializer:
    def test_card_fields(self):
        guide = CMSGuideFactory(
            slug="how-to",
            title="How To",
            meta_description="A guide.",
            category="CTET",
        )
        data = CMSGuideCardSerializer(guide).data
        assert data == {
            "slug": "how-to",
            "title": "How To",
            "meta_description": "A guide.",
            "category": "CTET",
        }


class TestCMSGuideDetailSerializer:
    def test_exposes_blocks_category_and_related(self):
        guide = CMSGuideFactory(slug="g", locale="as", category="CTET")
        CMSBlockFactory(page=guide, block_type="rich_text", sort_order=1)
        CMSBlockFactory(page=guide, block_type="hero", sort_order=0)
        sibling = CMSGuideFactory(slug="sib", locale="as", category="CTET")

        loaded = get_published_guide_by_slug(slug="g", locale="as")
        related = list_related_guides(guide=loaded)
        data = CMSGuideDetailSerializer(loaded, context={"related": related}).data

        assert set(data.keys()) == {
            "slug",
            "title",
            "meta_title",
            "meta_description",
            "category",
            "locale",
            "published_at",
            "blocks",
            "related",
        }
        assert [b["block_type"] for b in data["blocks"]] == ["hero", "rich_text"]
        assert data["category"] == "CTET"
        assert [r["slug"] for r in data["related"]] == [sibling.slug]

    def test_related_defaults_to_empty_without_context(self):
        guide = CMSGuideFactory(slug="lonely", locale="as")
        data = CMSGuideDetailSerializer(guide).data
        assert data["related"] == []
