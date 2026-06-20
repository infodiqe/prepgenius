"""CMS admin is standard, full-CRUD Django Admin (T41): admins author content."""
import pytest
from django.contrib.admin.sites import AdminSite, site
from django.test import RequestFactory

from accounts.models import User
from cms.admin import CMSBlockAdmin, CMSPageAdmin
from cms.models import CMSBlock, CMSPage

pytestmark = pytest.mark.django_db


@pytest.fixture
def request_as_superuser():
    user = User.objects.create_superuser(
        email="cms-admin@example.com", password="x", full_name="Admin"
    )
    request = RequestFactory().get("/")
    request.user = user
    return request


class TestCMSAdminRegistration:
    def test_models_registered(self):
        assert CMSPage in site._registry
        assert CMSBlock in site._registry


class TestCMSPageAdminConfig:
    def _admin(self):
        return CMSPageAdmin(CMSPage, AdminSite())

    def test_list_search_filter_ordering(self):
        admin = self._admin()
        assert "slug" in admin.search_fields
        assert "status" in admin.list_filter
        assert "locale" in admin.list_filter
        assert admin.ordering == ["-updated_at"]

    def test_blocks_editable_inline(self):
        admin = self._admin()
        assert any(inline.model is CMSBlock for inline in admin.inlines)

    def test_admins_can_create_and_edit(self, request_as_superuser):
        admin = self._admin()
        assert admin.has_add_permission(request_as_superuser) is True
        assert admin.has_change_permission(request_as_superuser) is True


class TestCMSBlockAdminConfig:
    def test_search_filter_ordering(self):
        admin = CMSBlockAdmin(CMSBlock, AdminSite())
        assert "block_type" in admin.list_filter
        assert "page__slug" in admin.search_fields
        assert admin.ordering == ["page", "sort_order"]
