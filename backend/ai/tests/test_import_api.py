import uuid

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.models import AIQuestionDraft, DraftStatus
from ai.tests.factories import AIQuestionDraftFactory
from exams.tests.factories import SubtopicFactory
from questions.models import Question

pytestmark = pytest.mark.django_db


def _client_with_role(role_name: str | None):
    user = UserFactory(verified=True)
    if role_name:
        role, _ = Role.objects.get_or_create(
            name=role_name, defaults={"description": role_name, "is_system": True}
        )
        UserRole.objects.create(user=user, role=role)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _url(draft_id):
    return reverse("ai:draft-import", kwargs={"draft_id": draft_id})


def _body():
    subtopic = SubtopicFactory()
    return {"exam_id": str(subtopic.topic.subject.exam_id), "subtopic_id": str(subtopic.id)}


class TestAuthAndRbac:
    def test_unauthenticated_401(self):
        draft = AIQuestionDraftFactory()
        assert APIClient().post(_url(draft.id), _body(), format="json").status_code == 401

    def test_student_403(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("student")
        assert client.post(_url(draft.id), _body(), format="json").status_code == 403

    @pytest.mark.parametrize("role", ["content_manager", "platform_admin"])
    def test_operator_imports_201(self, role):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role(role)
        resp = client.post(_url(draft.id), _body(), format="json")
        assert resp.status_code == 201
        data = resp.json()
        assert data["draft_id"] == str(draft.id)
        assert data["review_status"] == "draft"
        assert data["origin"] == "ai"
        assert data["imported_at"]
        assert Question.objects.filter(id=data["question_id"]).exists()
        draft.refresh_from_db()
        assert draft.status == DraftStatus.IMPORTED


class TestErrors:
    def test_draft_not_found_404(self):
        client, _ = _client_with_role("content_manager")
        assert client.post(_url(uuid.uuid4()), _body(), format="json").status_code == 404

    def test_already_imported_409(self):
        draft = AIQuestionDraftFactory(status=DraftStatus.IMPORTED)
        client, _ = _client_with_role("content_manager")
        assert client.post(_url(draft.id), _body(), format="json").status_code == 409

    def test_discarded_409(self):
        draft = AIQuestionDraftFactory(status=DraftStatus.DISCARDED)
        client, _ = _client_with_role("content_manager")
        assert client.post(_url(draft.id), _body(), format="json").status_code == 409

    def test_bad_exam_reference_400(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        body = {"exam_id": str(uuid.uuid4()), "subtopic_id": str(uuid.uuid4())}
        assert client.post(_url(draft.id), body, format="json").status_code == 400

    def test_missing_field_400(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        assert client.post(_url(draft.id), {}, format="json").status_code == 400
        assert Question.objects.count() == 0
