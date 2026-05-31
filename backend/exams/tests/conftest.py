"""Pytest configuration and shared fixtures for exams app tests."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserRole
from accounts.tests.factories import UserFactory

from .factories import (
    ExamFactory,
    PreviousYearPaperFactory,
    SubjectFactory,
    SubtopicFactory,
    SyllabusItemFactory,
    TopicFactory,
)

# ── Base API Client ───────────────────────────────────────────────────────────


@pytest.fixture
def anonymous_client():
    return APIClient()


# ── Authenticated Clients ─────────────────────────────────────────────────────


@pytest.fixture
def authenticated_client(anonymous_client):
    user = UserFactory()
    refresh = RefreshToken.for_user(user)
    anonymous_client.cookies["access_token"] = str(refresh.access_token)
    anonymous_client.cookies["refresh_token"] = str(refresh)
    return anonymous_client, user


@pytest.fixture
def admin_client(anonymous_client, seed_roles):
    role_map, _ = seed_roles
    user = UserFactory(is_email_verified=True, status="active")
    UserRole.objects.create(user=user, role=role_map["platform_admin"])
    refresh = RefreshToken.for_user(user)
    anonymous_client.cookies["access_token"] = str(refresh.access_token)
    anonymous_client.cookies["refresh_token"] = str(refresh)
    return anonymous_client, user


@pytest.fixture
def content_manager_client(anonymous_client, seed_roles):
    role_map, _ = seed_roles
    user = UserFactory(is_email_verified=True, status="active")
    UserRole.objects.create(user=user, role=role_map["content_manager"])
    refresh = RefreshToken.for_user(user)
    anonymous_client.cookies["access_token"] = str(refresh.access_token)
    anonymous_client.cookies["refresh_token"] = str(refresh)
    return anonymous_client, user


# ── Role-specific API clients (return APIClient only, no tuple) ────────────────


def _make_role_api_client(role_name: str):
    @pytest.fixture
    def _client(anonymous_client, seed_roles):
        role_map, _ = seed_roles
        user = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=user, role=role_map[role_name])
        refresh = RefreshToken.for_user(user)
        anonymous_client.cookies["access_token"] = str(refresh.access_token)
        anonymous_client.cookies["refresh_token"] = str(refresh)
        return anonymous_client

    return _client


student_api_client = _make_role_api_client("student")
teacher_api_client = _make_role_api_client("teacher")
content_manager_api_client = _make_role_api_client("content_manager")
content_reviewer_api_client = _make_role_api_client("content_reviewer")
sme_api_client = _make_role_api_client("sme")
institution_admin_api_client = _make_role_api_client("institution_admin")
platform_admin_api_client = _make_role_api_client("platform_admin")


# ── Seed Roles ────────────────────────────────────────────────────────────────


@pytest.fixture
def seed_roles():
    from accounts.models import Permission, Role, RolePermission

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


# ── Exam Domain Fixtures ──────────────────────────────────────────────────────


@pytest.fixture
def exam():
    return ExamFactory()


@pytest.fixture
def inactive_exam():
    return ExamFactory(is_active=False)


@pytest.fixture
def subject(exam):
    return SubjectFactory(exam=exam, name="Science", position=1)


@pytest.fixture
def topic(subject):
    return TopicFactory(subject=subject, name="Physics", position=1)


@pytest.fixture
def subtopic(topic):
    return SubtopicFactory(topic=topic, name="Motion", position=1)


@pytest.fixture
def syllabus_item(exam, topic, subtopic):
    return SyllabusItemFactory(
        exam=exam,
        title="Newton's Laws of Motion",
        topic=topic,
        subtopic=subtopic,
        weightage=15.00,
        position=1,
    )


@pytest.fixture
def previous_year_paper(exam):
    return PreviousYearPaperFactory(
        exam=exam,
        code="CTET_P2_SCI_2024_AS",
        year=2024,
        total_questions=150,
    )


# ── Hierarchy Fixture (CTET Exam → Science → Physics → Motion) ───────────────


@pytest.fixture
def exam_hierarchy():
    exam = ExamFactory(
        code="CTET_P2_SCI",
        name="CTET Paper II (Science)",
        exam_type="qualifying",
    )
    science = SubjectFactory(exam=exam, name="Science", position=1)
    physics = TopicFactory(subject=science, name="Physics", position=1)
    motion = SubtopicFactory(topic=physics, name="Motion", position=1)
    return {
        "exam": exam,
        "subject": science,
        "topic": physics,
        "subtopic": motion,
    }
