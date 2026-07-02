import uuid

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.models import AIQuestionDraft, DraftStatus
from ai.tests.factories import AIQuestionDraftFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("ai:draft-list")


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


def _detail_url(draft_id):
    return reverse("ai:draft-detail", kwargs={"draft_id": draft_id})


def _discard_url(draft_id):
    return reverse("ai:draft-discard", kwargs={"draft_id": draft_id})


class TestDraftListRbac:
    def test_unauthenticated_401(self):
        assert APIClient().get(LIST_URL).status_code == 401

    def test_student_403(self):
        client, _ = _client_with_role("student")
        assert client.get(LIST_URL).status_code == 403

    @pytest.mark.parametrize("role", ["content_manager", "platform_admin"])
    def test_operator_200(self, role):
        AIQuestionDraftFactory()
        client, _ = _client_with_role(role)
        resp = client.get(LIST_URL)
        assert resp.status_code == 200
        body = resp.json()
        assert "results" in body and "count" in body
        assert body["count"] == 1


class TestDraftListFiltersSearchSortPaginate:
    def test_filters(self):
        AIQuestionDraftFactory(exam="CTET", subject="Maths", difficulty="easy", language="en", provider="groq")
        AIQuestionDraftFactory(exam="SSC", subject="GK", difficulty="hard", language="hi", provider="openai")
        client, _ = _client_with_role("content_manager")
        assert client.get(LIST_URL, {"exam": "CTET"}).json()["count"] == 1
        assert client.get(LIST_URL, {"difficulty": "hard"}).json()["count"] == 1
        assert client.get(LIST_URL, {"language": "en"}).json()["count"] == 1
        assert client.get(LIST_URL, {"provider": "openai"}).json()["count"] == 1
        assert client.get(LIST_URL, {"status": "generated"}).json()["count"] == 2

    def test_search(self):
        AIQuestionDraftFactory(stem="What is a fraction?", topic="Numbers")
        AIQuestionDraftFactory(stem="Define velocity", topic="Numbers")
        client, _ = _client_with_role("content_manager")
        resp = client.get(LIST_URL, {"search": "fraction"})
        assert resp.json()["count"] == 1

    def test_ordering_whitelisted(self):
        AIQuestionDraftFactory(difficulty="easy")
        AIQuestionDraftFactory(difficulty="hard")
        client, _ = _client_with_role("content_manager")
        resp = client.get(LIST_URL, {"ordering": "difficulty"})
        diffs = [r["difficulty"] for r in resp.json()["results"]]
        assert diffs == ["easy", "hard"]
        # A non-whitelisted ordering falls back to default (no error).
        assert client.get(LIST_URL, {"ordering": "id; DROP"}).status_code == 200

    def test_pagination(self):
        for _ in range(3):
            AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        resp = client.get(LIST_URL, {"limit": 2})
        body = resp.json()
        assert body["count"] == 3
        assert len(body["results"]) == 2
        assert body["next"] is not None


class TestDraftDetail:
    def test_full_preview(self):
        author = UserFactory(email="author@example.com")
        draft = AIQuestionDraftFactory(
            created_by=author,
            validation_report={"valid": True, "errors": [], "warnings": [{"code": "tags_empty"}]},
        )
        client, _ = _client_with_role("content_manager")
        resp = client.get(_detail_url(draft.id))
        assert resp.status_code == 200
        body = resp.json()
        assert body["stem"]
        assert "options" in body and "explanation" in body
        assert body["prompt_type"] == "question_generation"
        assert body["created_by_email"] == "author@example.com"
        assert body["validation_report"]["warnings"][0]["code"] == "tags_empty"

    def test_not_found_404(self):
        client, _ = _client_with_role("content_manager")
        assert client.get(_detail_url(uuid.uuid4())).status_code == 404

    def test_student_403(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("student")
        assert client.get(_detail_url(draft.id)).status_code == 403


class TestDraftDiscard:
    def test_discards_generated_draft(self):
        draft = AIQuestionDraftFactory(status=DraftStatus.GENERATED)
        client, _ = _client_with_role("content_manager")
        resp = client.post(_discard_url(draft.id))
        assert resp.status_code == 200
        assert resp.json()["status"] == "discarded"
        draft.refresh_from_db()
        assert draft.status == DraftStatus.DISCARDED

    def test_discard_imported_conflict_409(self):
        draft = AIQuestionDraftFactory(status=DraftStatus.IMPORTED)
        client, _ = _client_with_role("content_manager")
        assert client.post(_discard_url(draft.id)).status_code == 409

    def test_discard_already_discarded_409(self):
        draft = AIQuestionDraftFactory(status=DraftStatus.DISCARDED)
        client, _ = _client_with_role("content_manager")
        assert client.post(_discard_url(draft.id)).status_code == 409

    def test_discard_missing_404(self):
        client, _ = _client_with_role("content_manager")
        assert client.post(_discard_url(uuid.uuid4())).status_code == 404

    def test_discard_student_403(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("student")
        assert client.post(_discard_url(draft.id)).status_code == 403


class TestDiscardService:
    def test_discard_draft_service_guard(self):
        from ai.generation.exceptions import DraftNotDiscardableError, DraftNotFoundError
        from ai.generation.import_service import discard_draft

        draft = AIQuestionDraftFactory(status=DraftStatus.IMPORTED)
        with pytest.raises(DraftNotDiscardableError):
            discard_draft(draft_id=draft.id)
        with pytest.raises(DraftNotFoundError):
            discard_draft(draft_id=uuid.uuid4())
