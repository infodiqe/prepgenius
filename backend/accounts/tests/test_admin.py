"""ADMIN-HARDEN-02 / P0: User deletion compliance hardening.

Hard delete is disabled in the admin; operators must use the
"Anonymize and Deactivate" action, which soft-deletes via the shared DPDP
service (anonymize PII, tombstone, deactivate, revoke sessions) while preserving
the user row and the audit/history that references it.
"""
import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory

from accounts.admin import UserAdmin
from accounts.models import User
from content_review.models import ContentReview

from .factories import ActiveUserFactory

pytestmark = pytest.mark.django_db


def _admin():
    return UserAdmin(User, AdminSite())


def _request(user):
    request = RequestFactory().post("/")
    request.user = user
    # Attach a messages backend so admin.message_user() works off-request.
    request.session = {}
    request._messages = FallbackStorage(request)
    return request


@pytest.fixture
def superuser():
    return User.objects.create_superuser(
        email="harden-useradmin@example.com", password="x", full_name="Admin"
    )


class TestUserAdminDeleteDisabled:
    def test_delete_permission_disabled(self, superuser):
        request = _request(superuser)
        assert _admin().has_delete_permission(request) is False
        assert _admin().has_delete_permission(request, obj=superuser) is False

    def test_no_delete_selected_action_exposed(self, superuser):
        request = _request(superuser)
        actions = _admin().get_actions(request)
        assert "delete_selected" not in actions
        assert "anonymize_and_deactivate" in actions


class TestAnonymizeAndDeactivateAction:
    def test_anonymizes_pii_and_soft_deletes(self, superuser):
        target = ActiveUserFactory(
            email="victim@example.com",
            full_name="Real Name",
            phone_e164="+919999999999",
        )
        original_email = target.email

        admin_obj = _admin()
        admin_obj.anonymize_and_deactivate(
            _request(superuser), User.objects.filter(pk=target.pk)
        )

        target.refresh_from_db()
        assert target.status == "deleted"
        assert target.is_active is False
        assert target.deleted_at is not None
        assert target.full_name == "Deleted User"
        assert target.phone_e164 is None
        assert target.email != original_email
        assert target.email.startswith("deleted_")
        assert target.email.endswith("@deleted.prepgenius.invalid")
        assert not target.has_usable_password()

    def test_preserves_audit_history(self, superuser):
        target = ActiveUserFactory(email="actor@example.com")
        # An audit row authored by the user (actor FK is SET_NULL on hard delete,
        # but soft-delete must keep the row AND the linkage intact).
        review = ContentReview.objects.create(actor=target, action="approve")

        _admin().anonymize_and_deactivate(
            _request(superuser), User.objects.filter(pk=target.pk)
        )

        review.refresh_from_db()
        assert ContentReview.objects.filter(pk=review.pk).exists()
        assert review.actor_id == target.pk  # user row preserved, linkage intact
        assert User.objects.filter(pk=target.pk).exists()

    def test_skips_already_deleted_users(self, superuser):
        already = ActiveUserFactory(email="gone@example.com")
        already.status = "deleted"
        already.full_name = "Deleted User"
        already.save()

        # Should not raise and should not re-anonymize (full_name stays).
        _admin().anonymize_and_deactivate(
            _request(superuser), User.objects.filter(pk=already.pk)
        )

        already.refresh_from_db()
        assert already.status == "deleted"

    def test_bulk_anonymizes_multiple(self, superuser):
        u1 = ActiveUserFactory(email="a@example.com")
        u2 = ActiveUserFactory(email="b@example.com")

        _admin().anonymize_and_deactivate(
            _request(superuser), User.objects.filter(pk__in=[u1.pk, u2.pk])
        )

        for u in (u1, u2):
            u.refresh_from_db()
            assert u.status == "deleted"
            assert u.is_active is False


class TestUserManagementNoRegression:
    def test_add_and_change_still_permitted(self, superuser):
        request = _request(superuser)
        assert _admin().has_add_permission(request) is True
        assert _admin().has_change_permission(request) is True
        assert _admin().has_view_permission(request) is True

    def test_admin_creation_form_still_works(self, superuser):
        from accounts.admin import AdminUserCreationForm

        form = AdminUserCreationForm(
            data={
                "email": "newuser@example.com",
                "full_name": "New User",
                "password1": "StrongPass123!",
                "password2": "StrongPass123!",
            }
        )
        assert form.is_valid(), form.errors
        user = form.save()
        assert user.pk is not None
        assert user.check_password("StrongPass123!")
