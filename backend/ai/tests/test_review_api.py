"""
AI Content Review Assistant API tests (Sprint-6B-04, Task 6 workspace + permissions).

The gateway ``generate`` is stubbed (no live AI, no credit side effects); quality
runs with an empty corpus via the real analyzer. Credit enforcement itself is
covered at the service/gateway level.
"""
import uuid

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.models import DraftStatus
from ai.review import ReviewAction
from ai.tests.factories import AIQuestionDraftFactory
from ai.tests.generation_utils import make_result, question_dict, valid_json

pytestmark = pytest.mark.django_db


def _client_with_role(role_name):
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
    def _set(result):
        monkeypatch.setattr("ai.generation.service.gateway_generate", lambda **kw: result)

    return _set


def _improve_url(draft_id):
    return reverse("ai:review-improve", args=[draft_id])


def _recs_url(draft_id):
    return reverse("ai:review-recommendations", args=[draft_id])


class TestReviewActionsCatalog:
    def test_lists_all_actions(self):
        client, _ = _client_with_role("content_manager")
        resp = client.get(reverse("ai:review-actions"))
        assert resp.status_code == 200
        values = {row["value"] for row in resp.json()}
        assert values == {a.value for a in ReviewAction}

    def test_requires_operator(self):
        client, _ = _client_with_role("student")
        assert client.get(reverse("ai:review-actions")).status_code == 403


class TestRecommendations:
    def test_returns_recommendations(self, stub_gateway):
        draft = AIQuestionDraftFactory(explanation="Short.")
        client, _ = _client_with_role("content_manager")
        resp = client.get(_recs_url(draft.id))
        assert resp.status_code == 200
        body = resp.json()
        assert "recommendations" in body and body["recommendations"]
        assert "quality_grade" in body

    def test_missing_draft_404(self):
        client, _ = _client_with_role("content_manager")
        assert client.get(_recs_url(uuid.uuid4())).status_code == 404

    def test_student_forbidden(self):
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("student")
        assert client.get(_recs_url(draft.id)).status_code == 403


class TestImproveRbac:
    def test_unauthenticated_401(self):
        draft = AIQuestionDraftFactory()
        body = {"action": ReviewAction.REWRITE_STEM.value}
        assert APIClient().post(_improve_url(draft.id), body, format="json").status_code == 401

    def test_student_403(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("student")
        body = {"action": ReviewAction.REWRITE_STEM.value}
        assert client.post(_improve_url(draft.id), body, format="json").status_code == 403

    @pytest.mark.parametrize("role", ["content_manager", "platform_admin"])
    def test_operator_improves_200(self, stub_gateway, role):
        stub_gateway(make_result(text=valid_json(count=1, stem="Clearer stem?")))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role(role)
        body = {"action": ReviewAction.REWRITE_STEM.value}
        resp = client.post(_improve_url(draft.id), body, format="json")
        assert resp.status_code == 200
        data = resp.json()
        assert data["draft"]["stem"] == "Clearer stem?"
        assert data["regeneration"]["version"] == 2
        assert data["regeneration"]["review_action"] == ReviewAction.REWRITE_STEM.value
        assert "quality_delta" in data["comparison"]


class TestImproveBehaviour:
    def test_invalid_action_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        resp = client.post(_improve_url(draft.id), {"action": "nope"}, format="json")
        assert resp.status_code == 400

    def test_missing_draft_404(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client, _ = _client_with_role("content_manager")
        body = {"action": ReviewAction.REWRITE_STEM.value}
        assert client.post(_improve_url(uuid.uuid4()), body, format="json").status_code == 404

    def test_imported_draft_409(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        draft = AIQuestionDraftFactory(status=DraftStatus.IMPORTED)
        client, _ = _client_with_role("content_manager")
        body = {"action": ReviewAction.REWRITE_STEM.value}
        assert client.post(_improve_url(draft.id), body, format="json").status_code == 409

    def test_invalid_improvement_422(self, stub_gateway):
        # Parses but fails real validation (missing explanation) → 422, draft kept.
        import json

        bad = question_dict(explanation="")
        stub_gateway(make_result(text=json.dumps({"questions": [bad]})))
        draft = AIQuestionDraftFactory(stem="Keep me")
        client, _ = _client_with_role("content_manager")
        body = {"action": ReviewAction.IMPROVE_EXPLANATION.value}
        resp = client.post(_improve_url(draft.id), body, format="json")
        assert resp.status_code == 422
        draft.refresh_from_db()
        assert draft.stem == "Keep me"

    def test_instructions_and_provider_accepted(self, stub_gateway):
        stub_gateway(make_result(text=valid_json(count=1, stem="With scenario"), provider="openai"))
        draft = AIQuestionDraftFactory()
        client, _ = _client_with_role("content_manager")
        body = {
            "action": ReviewAction.ADD_SCENARIO.value,
            "instructions": "Use a clinical scenario",
            "provider": "openai",
        }
        resp = client.post(_improve_url(draft.id), body, format="json")
        assert resp.status_code == 200
        assert resp.json()["regeneration"]["feedback"] == "Use a clinical scenario"
