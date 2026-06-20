"""ADMIN-HARDEN-02 / P0: ContentReview and ContentApproval must be view-only.

The content-trust audit trail (ContentReview) and the human sign-off provenance
(ContentApproval) are written exclusively through the service layer. The admin
may list/filter/search and render read-only detail pages, but must never permit
manual creation, editing, or deletion.
"""
import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from accounts.models import User
from content_review.admin import ContentApprovalAdmin, ContentReviewAdmin
from content_review.models import ContentApproval, ContentReview

pytestmark = pytest.mark.django_db


@pytest.fixture
def request_as_superuser():
    user = User.objects.create_superuser(
        email="harden-admin@example.com", password="x", full_name="Admin"
    )
    request = RequestFactory().get("/")
    request.user = user
    return request


class TestContentReviewAdminViewOnly:
    def _admin(self):
        return ContentReviewAdmin(ContentReview, AdminSite())

    def test_add_disabled(self, request_as_superuser):
        assert self._admin().has_add_permission(request_as_superuser) is False

    def test_change_disabled(self, request_as_superuser):
        assert (
            self._admin().has_change_permission(request_as_superuser) is False
        )

    def test_delete_disabled(self, request_as_superuser):
        assert (
            self._admin().has_delete_permission(request_as_superuser) is False
        )

    def test_view_preserved(self, request_as_superuser):
        # Detail viewing must remain available (read-only).
        assert self._admin().has_view_permission(request_as_superuser) is True


class TestContentApprovalAdminViewOnly:
    def _admin(self):
        return ContentApprovalAdmin(ContentApproval, AdminSite())

    def test_add_disabled(self, request_as_superuser):
        assert self._admin().has_add_permission(request_as_superuser) is False

    def test_change_disabled(self, request_as_superuser):
        assert (
            self._admin().has_change_permission(request_as_superuser) is False
        )

    def test_delete_disabled(self, request_as_superuser):
        assert (
            self._admin().has_delete_permission(request_as_superuser) is False
        )

    def test_view_preserved(self, request_as_superuser):
        assert self._admin().has_view_permission(request_as_superuser) is True
