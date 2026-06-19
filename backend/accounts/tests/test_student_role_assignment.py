"""AUTH-HOTFIX-01 regression tests — student role assignment at registration.

These tests exercise the REAL registration service (no UserRoleFactory) to lock
in the fix and prevent the role-less-user defect from recurring.
"""
from unittest.mock import patch

import pytest
from django.core.exceptions import ImproperlyConfigured
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import EmailVerificationToken, Role, User, UserConsent, UserRole
from accounts.models.rbac import STUDENT
from accounts.permissions import IsStudent
from accounts.services.registration import create_user

pytestmark = pytest.mark.django_db


def _register(email="role.user@example.com"):
    with patch("accounts.services.registration.send_verification_email.delay"):
        return create_user(
            email=email,
            full_name="Role User",
            password="Str0ng!Pass",
        )


@pytest.mark.usefixtures("seed_roles")
class TestStudentRoleAssigned:
    # A — registration creates the student role
    def test_registration_assigns_global_student_role(self):
        user = _register()
        assert (
            UserRole.objects.filter(
                user=user, role__name=STUDENT, institution_id__isnull=True
            ).count()
            == 1
        )

    def test_assignment_is_idempotent(self):
        user = _register()
        # Re-running the same get_or_create must not create a duplicate.
        student_role = Role.objects.get(name=STUDENT)
        UserRole.objects.get_or_create(
            user=user, role=student_role, institution_id=None
        )
        assert (
            UserRole.objects.filter(
                user=user, role__name=STUDENT, institution_id__isnull=True
            ).count()
            == 1
        )

    # C — user created through real registration passes IsStudent
    def test_new_user_passes_is_student(self, rf):
        user = _register()
        request = rf.get("/")
        request.user = user
        assert IsStudent().has_permission(request, view=None) is True

    # E — authenticated profile endpoint exposes the student role
    def test_profile_endpoint_exposes_student_role(self, api_client):
        user = _register("profile.role@example.com")
        refresh = RefreshToken.for_user(user)
        api_client.cookies["access_token"] = str(refresh.access_token)
        api_client.cookies["refresh_token"] = str(refresh)

        resp = api_client.get("/api/v1/auth/profile/")

        assert resp.status_code == 200
        assert "student" in resp.data["roles"]


class TestMissingStudentRoleRollsBack:
    # B — missing student role causes a clear error and full rollback
    def test_missing_role_raises_and_rolls_back(self):
        # No seed_roles fixture here → the 'student' role does not exist.
        assert not Role.objects.filter(name=STUDENT).exists()

        with pytest.raises(ImproperlyConfigured):
            with patch(
                "accounts.services.registration.send_verification_email.delay"
            ):
                create_user(
                    email="rollback@example.com",
                    full_name="Rollback User",
                    password="Str0ng!Pass",
                )

        # Atomic rollback: user, consent, and verification token must not persist.
        assert not User.objects.filter(email="rollback@example.com").exists()
        assert UserConsent.objects.count() == 0
        assert EmailVerificationToken.objects.count() == 0
