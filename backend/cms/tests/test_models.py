import pytest
from django.db import IntegrityError, transaction

from cms.models import CMSBlock, CMSPage
from .factories import CMSBlockFactory, CMSPageFactory

pytestmark = pytest.mark.django_db


class TestCMSPageModel:
    def test_str(self):
        page = CMSPageFactory(slug="hello", locale="en", status="published")
        assert "hello" in str(page)
        assert "en" in str(page)

    def test_publish_sets_published_at(self):
        page = CMSPageFactory(status="published")
        assert page.published_at is not None

    def test_draft_has_no_published_at(self):
        page = CMSPageFactory(status="draft")
        assert page.published_at is None

    def test_same_slug_different_locale_allowed(self):
        CMSPageFactory(slug="shared", locale="as")
        CMSPageFactory(slug="shared", locale="en")
        assert CMSPage.objects.filter(slug="shared").count() == 2

    def test_same_slug_same_locale_rejected(self):
        CMSPageFactory(slug="dup", locale="as")
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                CMSPageFactory(slug="dup", locale="as")


class TestCMSBlockModel:
    def test_blocks_default_ordering_by_sort_order(self):
        page = CMSPageFactory()
        CMSBlockFactory(page=page, sort_order=2)
        CMSBlockFactory(page=page, sort_order=0)
        CMSBlockFactory(page=page, sort_order=1)
        orders = list(page.blocks.values_list("sort_order", flat=True))
        assert orders == [0, 1, 2]

    def test_cascade_delete_with_page(self):
        block = CMSBlockFactory()
        page = block.page
        page.delete()
        assert CMSBlock.objects.count() == 0
