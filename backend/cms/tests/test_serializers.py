import pytest

from cms.selectors import get_published_page_by_slug
from cms.serializers import CMSBlockSerializer, CMSPageSerializer
from .factories import CMSBlockFactory, CMSPageFactory

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
