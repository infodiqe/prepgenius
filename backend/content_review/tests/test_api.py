import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import UserRole
from accounts.tests.factories import UserFactory
from content_review.models import ContentApproval
from questions.models import Question

from questions.tests.factories import (
    DraftQuestionFactory,
    ExamFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)

pytestmark = pytest.mark.django_db


# ═══════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════


@pytest.fixture
def seed_roles():
    from accounts.models import Permission, Role, RolePermission

    Role.objects.all().delete()
    Permission.objects.all().delete()

    roles_data = [
        ("student", "Standard student"),
        ("content_manager", "Manages content"),
        ("content_reviewer", "Reviews questions"),
        ("sme", "Subject Matter Expert"),
        ("platform_admin", "Global admin"),
    ]
    permissions_data = [
        ("question.view", "View questions"),
        ("question.create", "Create questions"),
        ("question.edit", "Edit questions"),
        ("question.approve", "Approve questions"),
        ("question.publish", "Publish questions"),
    ]
    role_map = {}
    for name, desc in roles_data:
        role_map[name] = Role.objects.create(
            name=name, description=desc, is_system=True
        )

    perm_map = {}
    for code, desc in permissions_data:
        perm_map[code] = Permission.objects.create(
            code=code, description=desc
        )

    role_perm_map = {
        "student": ["question.view"],
        "content_manager": [
            "question.view",
            "question.create",
            "question.edit",
            "question.approve",
            "question.publish",
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
            RolePermission.objects.create(
                role=role, permission=perm_map[code]
            )

    return role_map, perm_map


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
def draft_question(exam_hierarchy):
    return DraftQuestionFactory(
        exam=exam_hierarchy["exam"],
        subtopic=exam_hierarchy["subtopic"],
        stem="A draft question for review testing.",
    )


def _make_api_client(role_name: str):
    @pytest.fixture
    def _client(seed_roles):
        role_map, _ = seed_roles
        user = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=user, role=role_map[role_name])
        refresh = RefreshToken.for_user(user)
        client = APIClient()
        client.cookies["access_token"] = str(refresh.access_token)
        client.cookies["refresh_token"] = str(refresh)
        client.user = user
        return client

    return _client


content_manager_client = _make_api_client("content_manager")
content_reviewer_client = _make_api_client("content_reviewer")
sme_client = _make_api_client("sme")
platform_admin_client = _make_api_client("platform_admin")
student_client = _make_api_client("student")


@pytest.fixture
def anonymous_client():
    return APIClient()


# ═══════════════════════════════════════════════════════════════════════
# CLAIM — POST /api/v1/questions/{pk}/claim/
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_reviewer, content_manager, platform_admin
# Unauthorized: sme, student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestClaimQuestionPermissions:
    API_PATH = "/api/v1/questions/{}/claim/"

    def test_content_reviewer_can_claim(
        self, draft_question, content_reviewer_client
    ):
        response = content_reviewer_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_content_manager_can_claim(
        self, draft_question, content_manager_client
    ):
        response = content_manager_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_platform_admin_can_claim(
        self, draft_question, platform_admin_client
    ):
        response = platform_admin_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_sme_cannot_claim(self, draft_question, sme_client):
        response = sme_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_student_cannot_claim(self, draft_question, student_client):
        response = student_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_anonymous_cannot_claim(
        self, draft_question, anonymous_client
    ):
        response = anonymous_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 401

    def test_returns_409_when_already_claimed(
        self,
        draft_question,
        content_reviewer_client,
        content_manager_client,
    ):
        content_reviewer_client.post(
            self.API_PATH.format(draft_question.id)
        )
        response = content_manager_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 409

    def test_returns_404_when_question_not_found(
        self, content_reviewer_client
    ):
        response = content_reviewer_client.post(
            self.API_PATH.format("00000000-0000-0000-0000-000000000000")
        )
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# RELEASE CLAIM — POST /api/v1/questions/{pk}/release-claim/
# ═══════════════════════════════════════════════════════════════════════
# content_reviewer: own claim only
# content_manager / platform_admin: any claim
# sme / student / anonymous: never
# ═══════════════════════════════════════════════════════════════════════


class TestReleaseClaimPermissions:
    API_PATH = "/api/v1/questions/{}/release-claim/"

    def test_content_reviewer_can_release_own_claim(
        self, draft_question, content_reviewer_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/claim/"
        )
        response = content_reviewer_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200
        draft_question.refresh_from_db()
        assert draft_question.claimed_by_id is None

    def test_content_reviewer_cannot_release_others_claim(
        self, draft_question, content_reviewer_client, content_manager_client
    ):
        content_manager_client.post(
            f"/api/v1/questions/{draft_question.id}/claim/"
        )
        response = content_reviewer_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_content_manager_can_release_any_claim(
        self, draft_question, content_reviewer_client, content_manager_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/claim/"
        )
        response = content_manager_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_platform_admin_can_release_any_claim(
        self,
        draft_question,
        content_reviewer_client,
        platform_admin_client,
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/claim/"
        )
        response = platform_admin_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_sme_cannot_release(
        self, draft_question, sme_client, content_manager_client
    ):
        content_manager_client.post(
            f"/api/v1/questions/{draft_question.id}/claim/"
        )
        response = sme_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_student_cannot_release(
        self, draft_question, student_client
    ):
        response = student_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_anonymous_cannot_release(
        self, draft_question, anonymous_client
    ):
        response = anonymous_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 401

    def test_returns_200_when_not_claimed(
        self, draft_question, content_reviewer_client
    ):
        response = content_reviewer_client.post(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════
# REVIEW HISTORY — GET /api/v1/questions/{pk}/reviews/
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_reviewer, sme, content_manager, platform_admin
# Unauthorized: student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestReviewHistoryPermissions:
    API_PATH = "/api/v1/questions/{}/reviews/"

    def test_content_reviewer_can_view(
        self, draft_question, content_reviewer_client
    ):
        response = content_reviewer_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_sme_can_view(self, draft_question, sme_client):
        response = sme_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_content_manager_can_view(
        self, draft_question, content_manager_client
    ):
        response = content_manager_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_platform_admin_can_view(
        self, draft_question, platform_admin_client
    ):
        response = platform_admin_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_student_cannot_view(self, draft_question, student_client):
        response = student_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_anonymous_cannot_view(
        self, draft_question, anonymous_client
    ):
        response = anonymous_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 401


# ═══════════════════════════════════════════════════════════════════════
# APPROVAL LIST — GET /api/v1/questions/{pk}/approvals/
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_reviewer, sme, content_manager, platform_admin
# Unauthorized: student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestApprovalListPermissions:
    API_PATH = "/api/v1/questions/{}/approvals/"

    def test_content_reviewer_can_view(
        self, draft_question, content_reviewer_client
    ):
        response = content_reviewer_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_sme_can_view(self, draft_question, sme_client):
        response = sme_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_content_manager_can_view(
        self, draft_question, content_manager_client
    ):
        response = content_manager_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_platform_admin_can_view(
        self, draft_question, platform_admin_client
    ):
        response = platform_admin_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_student_cannot_view(self, draft_question, student_client):
        response = student_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_anonymous_cannot_view(
        self, draft_question, anonymous_client
    ):
        response = anonymous_client.get(
            self.API_PATH.format(draft_question.id)
        )
        assert response.status_code == 401


# ═══════════════════════════════════════════════════════════════════════
# SUBMIT — POST /api/v1/questions/{pk}/submit/
# draft → in_review
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_reviewer, content_manager, platform_admin
# Unauthorized: sme, student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestSubmitQuestion:
    API_TPL = "/api/v1/questions/{}/submit/"

    def test_content_reviewer_can_submit(
        self, draft_question, content_reviewer_client
    ):
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200
        draft_question.refresh_from_db()
        assert draft_question.review_status == "in_review"

    def test_content_manager_can_submit(
        self, draft_question, content_manager_client
    ):
        response = content_manager_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_platform_admin_can_submit(
        self, draft_question, platform_admin_client
    ):
        response = platform_admin_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_sme_cannot_submit(self, draft_question, sme_client):
        response = sme_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_student_cannot_submit(self, draft_question, student_client):
        response = student_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_anonymous_cannot_submit(
        self, draft_question, anonymous_client
    ):
        response = anonymous_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 401

    def test_invalid_transition_from_published(
        self, draft_question, content_manager_client
    ):
        from questions.services.question_services import (
            update_question_review_status,
        )

        update_question_review_status(
            question_id=draft_question.id, review_status="in_review"
        )
        update_question_review_status(
            question_id=draft_question.id, review_status="approved"
        )
        update_question_review_status(
            question_id=draft_question.id, review_status="published"
        )
        response = content_manager_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 400

    def test_returns_404_for_missing_question(
        self, content_reviewer_client
    ):
        response = content_reviewer_client.post(
            self.API_TPL.format(
                "00000000-0000-0000-0000-000000000000"
            )
        )
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# APPROVE — POST /api/v1/questions/{pk}/approve/
# in_review → approved (reviewer level)
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_reviewer, content_manager, platform_admin
# Unauthorized: sme (from in_review), student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestApproveQuestion:
    API_TPL = "/api/v1/questions/{}/approve/"

    def _to_in_review(self, question, client):
        client.post(f"/api/v1/questions/{question.id}/submit/")

    def test_content_reviewer_can_approve(
        self, draft_question, content_reviewer_client
    ):
        self._to_in_review(draft_question, content_reviewer_client)
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200
        draft_question.refresh_from_db()
        assert draft_question.review_status == "approved"
        assert ContentApproval.objects.filter(
            question_id=draft_question.id
        ).exists()

    def test_sme_cannot_approve_from_in_review(
        self, draft_question, content_reviewer_client, sme_client
    ):
        self._to_in_review(draft_question, content_reviewer_client)
        response = sme_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_platform_admin_can_approve(
        self, draft_question, content_reviewer_client, platform_admin_client
    ):
        self._to_in_review(draft_question, content_reviewer_client)
        response = platform_admin_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_invalid_transition_from_draft(
        self, draft_question, content_reviewer_client
    ):
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 400

    def test_student_cannot_approve(
        self, draft_question, content_reviewer_client, student_client
    ):
        self._to_in_review(draft_question, content_reviewer_client)
        response = student_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# SME APPROVE — POST /api/v1/questions/{pk}/sme-approve/
# sme_review → approved (SME level)
# ═══════════════════════════════════════════════════════════════════════
# Authorized: sme, platform_admin
# Unauthorized: content_reviewer, student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestSmeApproveQuestion:
    API_TPL = "/api/v1/questions/{}/sme-approve/"

    def _to_sme_review(self, question, client):
        client.post(f"/api/v1/questions/{question.id}/submit/")
        client.post(f"/api/v1/questions/{question.id}/request-sme/")

    def test_sme_can_sme_approve(
        self, draft_question, content_reviewer_client, sme_client
    ):
        self._to_sme_review(draft_question, content_reviewer_client)
        response = sme_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200
        draft_question.refresh_from_db()
        assert draft_question.review_status == "approved"

    def test_content_reviewer_cannot_sme_approve(
        self, draft_question, content_reviewer_client
    ):
        self._to_sme_review(draft_question, content_reviewer_client)
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_platform_admin_can_sme_approve(
        self, draft_question, content_reviewer_client, platform_admin_client
    ):
        self._to_sme_review(draft_question, content_reviewer_client)
        response = platform_admin_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_invalid_transition_from_draft(
        self, draft_question, sme_client
    ):
        response = sme_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 400

    def test_student_cannot_sme_approve(
        self, draft_question, content_reviewer_client, student_client
    ):
        self._to_sme_review(draft_question, content_reviewer_client)
        response = student_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# REQUEST SME — POST /api/v1/questions/{pk}/request-sme/
# in_review → sme_review
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_reviewer, content_manager, platform_admin
# Unauthorized: sme, student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestRequestSmeReview:
    API_TPL = "/api/v1/questions/{}/request-sme/"

    def test_content_reviewer_can_request_sme(
        self, draft_question, content_reviewer_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/submit/"
        )
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200
        draft_question.refresh_from_db()
        assert draft_question.review_status == "sme_review"

    def test_sme_cannot_request_sme(
        self, draft_question, content_reviewer_client, sme_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/submit/"
        )
        response = sme_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_invalid_transition_from_draft(
        self, draft_question, content_reviewer_client
    ):
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 400

    def test_student_cannot_request_sme(
        self, draft_question, content_reviewer_client, student_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/submit/"
        )
        response = student_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# REJECT — POST /api/v1/questions/{pk}/reject/
# → rejected (from any reviewable state)
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_reviewer, sme, content_manager, platform_admin
# Unauthorized: student, anonymous
# ═══════════════════════════════════════════════════════════════════════


class TestRejectQuestion:
    API_TPL = "/api/v1/questions/{}/reject/"

    def test_content_reviewer_can_reject(
        self, draft_question, content_reviewer_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/submit/"
        )
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200
        draft_question.refresh_from_db()
        assert draft_question.review_status == "rejected"

    def test_sme_can_reject(
        self, draft_question, content_reviewer_client, sme_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/submit/"
        )
        response = sme_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_content_manager_can_reject(
        self, draft_question, content_reviewer_client, content_manager_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/submit/"
        )
        response = content_manager_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_student_cannot_reject(
        self, draft_question, content_reviewer_client, student_client
    ):
        content_reviewer_client.post(
            f"/api/v1/questions/{draft_question.id}/submit/"
        )
        response = student_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_invalid_transition_from_draft(
        self, draft_question, content_reviewer_client
    ):
        # draft cannot go directly to rejected
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 400


# ═══════════════════════════════════════════════════════════════════════
# PUBLISH — POST /api/v1/questions/{pk}/publish/
# approved → published
# ═══════════════════════════════════════════════════════════════════════
# Authorized: content_manager, platform_admin
# Unauthorized: content_reviewer, sme, student, anonymous
# Requires: at least one ContentApproval
# ═══════════════════════════════════════════════════════════════════════


class TestPublishQuestion:
    API_TPL = "/api/v1/questions/{}/publish/"

    def _to_approved(self, question, client):
        client.post(f"/api/v1/questions/{question.id}/submit/")
        client.post(f"/api/v1/questions/{question.id}/approve/")

    def test_content_manager_can_publish(
        self, draft_question, content_reviewer_client, content_manager_client
    ):
        self._to_approved(draft_question, content_reviewer_client)
        response = content_manager_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200
        draft_question.refresh_from_db()
        assert draft_question.review_status == "published"

    def test_platform_admin_can_publish(
        self, draft_question, content_reviewer_client, platform_admin_client
    ):
        self._to_approved(draft_question, content_reviewer_client)
        response = platform_admin_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 200

    def test_content_reviewer_cannot_publish(
        self, draft_question, content_reviewer_client
    ):
        self._to_approved(draft_question, content_reviewer_client)
        response = content_reviewer_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 403

    def test_fails_without_approval(
        self, draft_question, content_reviewer_client, content_manager_client
    ):
        self._to_approved(draft_question, content_reviewer_client)
        ContentApproval.objects.filter(
            question_id=draft_question.id
        ).delete()
        response = content_manager_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 400
        assert "approval" in str(response.data.get("detail", "")).lower()

    def test_fails_from_draft(
        self, draft_question, content_manager_client
    ):
        response = content_manager_client.post(
            self.API_TPL.format(draft_question.id)
        )
        assert response.status_code == 400
