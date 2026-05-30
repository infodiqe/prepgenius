"""Pytest configuration and shared fixtures for accounts app tests."""
import os

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Permission, Role, RolePermission

from .factories import UserFactory

os.environ.setdefault("DATABASE_URL", "sqlite:///test_prepgenius.sqlite3")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client):
    user = UserFactory()
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    api_client.cookies["access_token"] = access_token
    api_client.cookies["refresh_token"] = str(refresh)
    return api_client, user


@pytest.fixture
def seed_roles():
    Role.objects.all().delete()
    Permission.objects.all().delete()

    roles_data = [
        ("student", "Standard student / exam candidate"),
        ("teacher", "Batch teacher (institution-scoped)"),
        ("institution_admin", "Institution administrator"),
        ("content_manager", "Manages exam config, publishes content"),
        ("content_reviewer", "Reviews and approves/rejects questions"),
        ("sme", "Subject Matter Expert"),
        ("platform_admin", "Global platform administrator"),
    ]
    permissions_data = [
        ("question.view", "View published questions"),
        ("question.create", "Create draft questions"),
        ("question.edit", "Edit questions"),
        ("question.approve", "Approve questions (reviewer)"),
        ("question.publish", "Publish approved questions"),
        ("question.generate", "Generate AI draft questions"),
        ("exam.view", "View exam configurations"),
        ("exam.configure", "Configure exams"),
        ("mock.create", "Create mock tests"),
        ("institution.manage", "Manage institution and batches"),
        ("credit.view", "View credit balance"),
        ("credit.grant", "Grant credits (admin)"),
        ("analytics.view", "View analytics"),
        ("user.manage", "Manage users (admin)"),
    ]
    role_map = {}
    for name, desc in roles_data:
        role_map[name] = Role.objects.create(name=name, description=desc, is_system=True)

    perm_map = {}
    for code, desc in permissions_data:
        perm_map[code] = Permission.objects.create(code=code, description=desc)

    role_perm_map = {
        "student": ["question.view", "analytics.view", "credit.view"],
        "teacher": ["question.view", "mock.create", "analytics.view", "credit.view"],
        "institution_admin": [
            "question.view", "mock.create", "analytics.view", "credit.view",
            "institution.manage", "credit.grant",
        ],
        "content_manager": [
            "question.view", "question.create", "question.edit",
            "question.publish", "exam.view", "exam.configure",
        ],
        "content_reviewer": ["question.view", "question.edit", "question.approve"],
        "sme": ["question.view", "question.edit", "question.approve"],
        "platform_admin": list(perm_map.keys()),
    }
    for role_name, perm_codes in role_perm_map.items():
        role = role_map[role_name]
        for code in perm_codes:
            RolePermission.objects.create(role=role, permission=perm_map[code])

    return role_map, perm_map
