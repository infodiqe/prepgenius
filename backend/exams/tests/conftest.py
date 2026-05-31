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


# ── Seed Roles (reuse from accounts tests) ────────────────────────────────────


@pytest.fixture
def seed_roles():
    from accounts.tests.conftest import seed_roles as _seed_roles

    return _seed_roles()


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
