import uuid
from io import StringIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIRequestFactory
from rest_framework.permissions import IsAuthenticated
from unittest.mock import MagicMock
from django.contrib.auth.models import AnonymousUser

from accounts.models import Permission, Role, RolePermission, UserRole
from accounts.permissions import HasRole, IsInstitutionScoped, IsPlatformAdmin

from .factories import RoleFactory, UserFactory, UserRoleFactory

pytestmark = pytest.mark.django_db


class TestSeedRolesCommand:
    def test_seeds_all_roles_and_permissions_idempotently(self):
        out = StringIO()
        call_command("seed_roles", stdout=out)
        first = out.getvalue()

        assert Role.objects.count() == 7
        assert Permission.objects.count() == 14
        assert RolePermission.objects.count() >= 14

        for role in Role.objects.all():
            assert role.is_system is True

        out2 = StringIO()
        call_command("seed_roles", stdout=out2)
        second = out2.getvalue()

        assert Role.objects.count() == 7
        assert Permission.objects.count() == 14
        assert "Created" in first
        assert "Done" in first


class TestHasRole:
    def test_allows_user_with_matching_role(self):
        role = RoleFactory(name="content_manager")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = HasRole.for_roles("content_manager")()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is True

    def test_denies_user_without_matching_role(self):
        role = RoleFactory(name="content_manager")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = HasRole.for_roles("platform_admin")()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is False

    def test_denies_unauthenticated(self):
        permission = HasRole.for_roles("student")()
        request = APIRequestFactory().get("/")
        request.user = AnonymousUser()
        assert permission.has_permission(request, view=MagicMock()) is False


class TestIsPlatformAdmin:
    def test_allows_superuser(self):
        user = UserFactory(is_superuser=True, verified=True)
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is True

    def test_allows_platform_admin_role(self):
        role = RoleFactory(name="platform_admin")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is True

    def test_denies_regular_user(self):
        user = UserFactory(verified=True)
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is False

    def test_denies_unauthenticated(self):
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = AnonymousUser()
        assert permission.has_permission(request, view=MagicMock()) is False


class TestIsInstitutionScoped:
    def test_allows_user_with_matching_institution(self):
        inst_id = uuid.uuid4()
        role = RoleFactory(name="teacher")
        user = UserFactory()
        UserRoleFactory(user=user, role=role, institution_id=inst_id)
        permission = IsInstitutionScoped()
        request = APIRequestFactory().get("/")
        request.user = user
        view = MagicMock()
        view.kwargs = {"institution_id": str(inst_id)}
        assert permission.has_permission(request, view=view) is True

    def test_denies_user_from_different_institution(self):
        inst_id = uuid.uuid4()
        other_inst = uuid.uuid4()
        role = RoleFactory(name="teacher")
        user = UserFactory()
        UserRoleFactory(user=user, role=role, institution_id=inst_id)
        permission = IsInstitutionScoped()
        request = APIRequestFactory().get("/")
        request.user = user
        view = MagicMock()
        view.kwargs = {"institution_id": str(other_inst)}
        assert permission.has_permission(request, view=view) is False

    def test_denies_unauthenticated(self):
        permission = IsInstitutionScoped()
        request = APIRequestFactory().get("/")
        request.user = AnonymousUser()
        assert permission.has_permission(request, view=MagicMock()) is False
