"""Pytest fixtures for Attempt domain tests."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserRole
from accounts.tests.factories import UserFactory

from .factories import (
    ExamAttemptFactory,
    InProgressAttemptFactory,
    MockTestFactory,
    MockTestQuestionFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    QuestionStatFactory,
    UnpublishedMockTestFactory,
    UserAnswerFactory,
    ExamFactory,
    SubjectFactory,
    TopicFactory,
    SubtopicFactory,
)


# ── API Client Fixtures ───────────────────────────────────────────────


@pytest.fixture
def anonymous_client():
    return APIClient()


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
        role_map[name] = Role.objects.create(
            name=name, description=desc, is_system=True
        )

    perm_map = {}
    for code, desc in permissions_data:
        perm_map[code] = Permission.objects.create(code=code, description=desc)

    role_perm_map = {
        "student": ["question.view", "analytics.view", "credit.view"],
        "teacher": [
            "question.view",
            "mock.create",
            "analytics.view",
            "credit.view",
        ],
        "institution_admin": [
            "question.view",
            "mock.create",
            "analytics.view",
            "credit.view",
            "institution.manage",
            "credit.grant",
        ],
        "content_manager": [
            "question.view",
            "question.create",
            "question.edit",
            "question.publish",
            "exam.view",
            "exam.configure",
        ],
        "content_reviewer": [
            "question.view",
            "question.edit",
            "question.approve",
        ],
        "sme": ["question.view", "question.edit", "question.approve"],
        "platform_admin": list(perm_map.keys()),
    }
    for role_name, perm_codes in role_perm_map.items():
        role = role_map[role_name]
        for code in perm_codes:
            RolePermission.objects.create(role=role, permission=perm_map[code])

    return role_map, perm_map


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
content_manager_api_client = _make_role_api_client("content_manager")
platform_admin_api_client = _make_role_api_client("platform_admin")


# ── Domain Fixtures ───────────────────────────────────────────────────


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


@pytest.fixture
def exam(exam_hierarchy):
    return exam_hierarchy["exam"]


@pytest.fixture
def subtopic(exam_hierarchy):
    return exam_hierarchy["subtopic"]


@pytest.fixture
def published_question(exam_hierarchy):
    return PublishedQuestionFactory(
        exam=exam_hierarchy["exam"],
        subtopic=exam_hierarchy["subtopic"],
        stem="A practice question for mock tests.",
    )


@pytest.fixture
def question_with_options(published_question):
    options = []
    for i, (label, body, correct) in enumerate(
        [
            ("A", "Inertia is the tendency to resist change in motion", True),
            ("B", "Force equals mass times acceleration", False),
            ("C", "Every action has an equal reaction", False),
            ("D", "Energy is conserved", False),
        ]
    ):
        opt = QuestionOptionFactory(
            question=published_question,
            label=label,
            body=body,
            is_correct=correct,
            position=i + 1,
        )
        options.append(opt)
    return published_question, options


@pytest.fixture
def mock_test(exam_hierarchy):
    return MockTestFactory(
        exam=exam_hierarchy["exam"],
        name="CTET Full Mock",
        total_questions=3,
        duration_seconds=7200,
    )


@pytest.fixture
def unpublished_mock_test(exam_hierarchy):
    return UnpublishedMockTestFactory(
        exam=exam_hierarchy["exam"],
        name="Draft Mock Test",
    )


@pytest.fixture
def mock_test_with_questions(mock_test, published_question):
    questions = [published_question]
    for i in range(2):
        q = PublishedQuestionFactory(
            exam=mock_test.exam,
            subtopic=mock_test.exam.subjects.first().topics.first().subtopics.first(),
            stem=f"Mock question {i + 2}",
        )
        questions.append(q)
    for i, q in enumerate(questions):
        MockTestQuestionFactory(
            mock_test=mock_test,
            question=q,
            position=i + 1,
        )
    return mock_test


@pytest.fixture
def attempt(exam_hierarchy, mock_test_with_questions):
    user = UserFactory(is_email_verified=True, status="active")
    return InProgressAttemptFactory(
        user=user,
        exam=exam_hierarchy["exam"],
        mock_test=mock_test_with_questions,
        attempt_type="full_mock",
        total_questions=mock_test_with_questions.total_questions,
    )


@pytest.fixture
def user(exam_hierarchy):
    return UserFactory(is_email_verified=True, status="active")
