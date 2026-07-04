"""
Draft regeneration / versioning API tests (Sprint-6B-02).

The whole gateway ``generate`` is stubbed (no live AI, no credit side effects);
credit enforcement itself is covered at the gateway/service level. These assert
auth/RBAC, the regenerate/rollback endpoints, history, and version comparison.
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.models import DraftStatus
from ai.tests.factories import AIQuestionDraftFactory
from ai.tests.generation_utils import make_result, question_dict, valid_json

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


@pytest.fixture
def stub_gateway(monkeypatch):
    """Patch the single gateway entry point the generation service uses."""

    def _set(result):
        monkeypatch.setattr(
            "ai.generation.service.gateway_generate", lambda **kw: result
        )

    return _set


def _regen_url(draft_id):
    return reverse("ai:draft-regenerate", args=[draft_id])


class TestRegenerateRbac:
    def test_unauthenticated_401(self):
        draft = AIQuestionDraftFactory()
        assert APIClient().post(_regen_url(draft.id), {}, format="json").status_code == 401

    def test_student_forbidden_403(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("student")
        assert client.post(_regen_url(draft.id), {}, format="json").status_code == 403

    @pytest.mark.parametrize("role", ["content_manager", "platform_admin"])
    def test_operator_can_regenerate_200(self, stub_gateway, role):
        stub_gateway(make_result(text=valid_json(count=1, stem="Improved?")))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role(role)

        resp = client.post(_regen_url(draft.id), {}, format="json")
        assert resp.status_code == 200
        body = resp.json()
        assert body["draft"]["stem"] == "Improved?"
        assert body["regeneration"]["version"] == 2
        draft.refresh_from_db()
        assert draft.regeneration_count == 1
        assert draft.current_version == 2


class TestRegenerateBehaviour:
    def test_feedback_and_provider_accepted(self, stub_gateway):
        stub_gateway(make_result(text=valid_json(count=1, stem="Harder?"), provider="openai"))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")

        resp = client.post(
            _regen_url(draft.id),
            {"feedback": "Make harder", "provider": "openai"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["regeneration"]["feedback"] == "Make harder"

    def test_bad_provider_choice_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        resp = client.post(_regen_url(draft.id), {"provider": "nope"}, format="json")
        assert resp.status_code == 400

    def test_missing_draft_404(self, stub_gateway):
        import uuid

        stub_gateway(make_result(text=valid_json()))
        client, _ = _client_with_role("content_manager")
        assert client.post(_regen_url(uuid.uuid4()), {}, format="json").status_code == 404

    def test_imported_draft_conflict_409(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        draft = AIQuestionDraftFactory(status=DraftStatus.IMPORTED)
        client, _ = _client_with_role("content_manager")
        assert client.post(_regen_url(draft.id), {}, format="json").status_code == 409

    def test_invalid_regeneration_422_and_draft_preserved(self, stub_gateway):
        # Parses cleanly but fails real validation (missing explanation) → 422,
        # draft unchanged.
        import json

        bad = question_dict(explanation="")
        stub_gateway(make_result(text=json.dumps({"questions": [bad]})))
        draft = AIQuestionDraftFactory()
        before = draft.stem
        client, _ = _client_with_role("content_manager")

        resp = client.post(_regen_url(draft.id), {}, format="json")
        assert resp.status_code == 422
        assert "validation" in resp.json()
        draft.refresh_from_db()
        assert draft.stem == before
        assert draft.regeneration_count == 0


class TestHistoryEndpoint:
    def test_lists_versions_oldest_first(self, stub_gateway):
        stub_gateway(make_result(text=valid_json(count=1, stem="v2")))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        client.post(_regen_url(draft.id), {}, format="json")

        url = reverse("ai:draft-regenerations", args=[draft.id])
        resp = client.get(url)
        assert resp.status_code == 200
        body = resp.json()
        assert [row["version"] for row in body] == [1, 2]
        assert body[0]["is_original"] is True

    def test_history_missing_draft_404(self):
        import uuid

        client, _ = _client_with_role("content_manager")
        url = reverse("ai:draft-regenerations", args=[uuid.uuid4()])
        assert client.get(url).status_code == 404


class TestCompareEndpoint:
    def test_default_compare_current_vs_previous(self, stub_gateway):
        stub_gateway(make_result(text=valid_json(count=1, stem="Improved")))
        draft = AIQuestionDraftFactory(stem="Original")
        client, _ = _client_with_role("content_manager")
        client.post(_regen_url(draft.id), {}, format="json")

        url = reverse("ai:draft-compare", args=[draft.id])
        resp = client.get(url)
        assert resp.status_code == 200
        body = resp.json()
        assert body["current_version"] == 2
        assert body["previous_version"] == 1
        assert body["diff"]["stem"]["changed"] is True
        assert body["diff"]["stem"]["current"] == "Improved"

    def test_compare_without_history_404(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        url = reverse("ai:draft-compare", args=[draft.id])
        assert client.get(url).status_code == 404

    def test_bad_version_param_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json(count=1, stem="v2")))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        client.post(_regen_url(draft.id), {}, format="json")
        url = reverse("ai:draft-compare", args=[draft.id])
        assert client.get(url, {"current": "abc"}).status_code == 400


class TestRollbackEndpoint:
    def test_rollback_restores_content(self, stub_gateway):
        stub_gateway(make_result(text=valid_json(count=1, stem="Regenerated")))
        draft = AIQuestionDraftFactory(stem="Original")
        client, _ = _client_with_role("content_manager")
        client.post(_regen_url(draft.id), {}, format="json")

        url = reverse("ai:draft-rollback", args=[draft.id])
        resp = client.post(url, {"version": 1}, format="json")
        assert resp.status_code == 200
        assert resp.json()["stem"] == "Original"
        draft.refresh_from_db()
        assert draft.stem == "Original"
        assert draft.current_version == 1

    def test_rollback_unknown_version_404(self, stub_gateway):
        stub_gateway(make_result(text=valid_json(count=1, stem="v2")))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        client.post(_regen_url(draft.id), {}, format="json")
        url = reverse("ai:draft-rollback", args=[draft.id])
        assert client.post(url, {"version": 99}, format="json").status_code == 404

    def test_rollback_student_forbidden_403(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("student")
        url = reverse("ai:draft-rollback", args=[draft.id])
        assert client.post(url, {"version": 1}, format="json").status_code == 403
