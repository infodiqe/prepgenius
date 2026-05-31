"""Pytest fixtures for Question domain tests."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserRole
from accounts.tests.factories import UserFactory

from .factories import (
    AiGeneratedQuestionFactory,
    DraftQuestionFactory,
    ExamFactory,
    PreviousYearPaperFactory,
    PublishedQuestionFactory,
    QuestionAppearanceFactory,
    QuestionFactory,
    QuestionOptionFactory,
    QuestionStatFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
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
content_reviewer_api_client = _make_role_api_client("content_reviewer")
sme_api_client = _make_role_api_client("sme")
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
def question(exam_hierarchy):
    return QuestionFactory(
        exam=exam_hierarchy["exam"],
        subtopic=exam_hierarchy["subtopic"],
        stem="What is Newton's First Law of Motion?",
        difficulty=2,
    )


@pytest.fixture
def question_with_options(question):
    options = []
    for i, (label, body, correct) in enumerate(
        [
            ("A", "An object at rest stays at rest until acted upon by an external force", True),
            ("B", "Force equals mass times acceleration", False),
            ("C", "Every action has an equal and opposite reaction", False),
            ("D", "Energy cannot be created or destroyed", False),
        ]
    ):
        opt = QuestionOptionFactory(
            question=question,
            label=label,
            body=body,
            is_correct=correct,
            position=i + 1,
        )
        options.append(opt)
    return question, options


@pytest.fixture
def published_question(exam_hierarchy):
    return PublishedQuestionFactory(
        exam=exam_hierarchy["exam"],
        subtopic=exam_hierarchy["subtopic"],
        stem="A published question for testing.",
    )


@pytest.fixture
def draft_question(exam_hierarchy):
    return DraftQuestionFactory(
        exam=exam_hierarchy["exam"],
        subtopic=exam_hierarchy["subtopic"],
        stem="A draft question for testing.",
    )


@pytest.fixture
def previous_year_paper(exam_hierarchy):
    return PreviousYearPaperFactory(
        exam=exam_hierarchy["exam"],
        code="CTET_2024_P2_SCI",
        year=2024,
        total_questions=150,
    )


@pytest.fixture
def question_appearance(exam_hierarchy, question, previous_year_paper):
    return QuestionAppearanceFactory(
        question=question,
        paper=previous_year_paper,
        year=2024,
    )


@pytest.fixture
def question_stat(question):
    return QuestionStatFactory(question=question)


@pytest.fixture
def ai_generated_question(exam_hierarchy):
    return AiGeneratedQuestionFactory(
        exam=exam_hierarchy["exam"],
        subtopic=exam_hierarchy["subtopic"],
        model_used="groq/llama-3.3-70b-versatile",
    )
