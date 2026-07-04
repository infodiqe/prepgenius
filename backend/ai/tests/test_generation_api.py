import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.tests.generation_utils import make_result, valid_json

pytestmark = pytest.mark.django_db

URL = reverse("ai:questions-generate")

VALID_BODY = {
    "exam": "CTET",
    "subject": "Mathematics",
    "topic": "Fractions",
    "difficulty": "medium",
    "bloom_level": "apply",
    "question_type": "single_correct",
    "language": "en",
    "count": 2,
}


def _client_with_role(role_name: str | None):
    user = UserFactory(verified=True)
    if role_name:
        role, _ = Role.objects.get_or_create(
            name=role_name, defaults={"description": role_name, "is_system": True}
        )
        UserRole.objects.create(user=user, role=role)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def stub_gateway(monkeypatch):
    """Patch the gateway entry point the service uses. Returns a setter."""

    def _set(result):
        monkeypatch.setattr("ai.generation.service.gateway_generate", lambda **kw: result)

    return _set


class TestAuthAndRbac:
    def test_unauthenticated_401(self):
        resp = APIClient().post(URL, VALID_BODY, format="json")
        assert resp.status_code == 401

    def test_student_forbidden_403(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client = _client_with_role("student")
        resp = client.post(URL, VALID_BODY, format="json")
        assert resp.status_code == 403

    def test_no_role_forbidden_403(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client = _client_with_role(None)
        resp = client.post(URL, VALID_BODY, format="json")
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["content_manager", "platform_admin"])
    def test_operator_allowed_200(self, stub_gateway, role):
        stub_gateway(make_result(text=valid_json(count=2)))
        client = _client_with_role(role)
        resp = client.post(URL, VALID_BODY, format="json")
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 2
        assert body["provider"] == "mock"
        assert body["questions"][0]["source"] == "ai"
        assert body["questions"][0]["correct_answer"] == "B"


class TestRequestValidation:
    def test_missing_required_field_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client = _client_with_role("content_manager")
        body = {**VALID_BODY}
        del body["exam"]
        resp = client.post(URL, body, format="json")
        assert resp.status_code == 400

    def test_count_out_of_range_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client = _client_with_role("content_manager")
        resp = client.post(URL, {**VALID_BODY, "count": 999}, format="json")
        assert resp.status_code == 400

    def test_bad_difficulty_choice_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client = _client_with_role("content_manager")
        resp = client.post(URL, {**VALID_BODY, "difficulty": "nope"}, format="json")
        assert resp.status_code == 400

    def test_unsupported_question_type_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client = _client_with_role("content_manager")
        resp = client.post(URL, {**VALID_BODY, "question_type": "multi_correct"}, format="json")
        assert resp.status_code == 400

    def test_unsupported_language_400(self, stub_gateway):
        stub_gateway(make_result(text=valid_json()))
        client = _client_with_role("content_manager")
        resp = client.post(URL, {**VALID_BODY, "language": "fr"}, format="json")
        assert resp.status_code == 400


class TestProviderErrorMapping:
    def _post(self, stub_gateway, result):
        stub_gateway(result)
        client = _client_with_role("content_manager")
        return client.post(URL, VALID_BODY, format="json")

    def test_provider_unavailable_503(self, stub_gateway):
        resp = self._post(stub_gateway, make_result(success=False, error="all providers failed"))
        assert resp.status_code == 503

    def test_timeout_504(self, stub_gateway):
        resp = self._post(stub_gateway, make_result(success=False, error="groq timed out"))
        assert resp.status_code == 504

    def test_invalid_ai_response_502(self, stub_gateway):
        resp = self._post(stub_gateway, make_result(text="not json {"))
        assert resp.status_code == 502

    def test_empty_ai_response_502(self, stub_gateway):
        resp = self._post(stub_gateway, make_result(text="   "))
        assert resp.status_code == 502

    def test_insufficient_credits_402(self, monkeypatch):
        # The gateway raises InsufficientCreditsError before any provider call;
        # the endpoint surfaces it as HTTP 402 Payment Required (Sprint-6B-01).
        from ai.exceptions import InsufficientCreditsError

        def raise_insufficient(**kw):
            raise InsufficientCreditsError("Not enough available credits to reserve.")

        monkeypatch.setattr(
            "ai.generation.service.gateway_generate", raise_insufficient
        )
        client = _client_with_role("content_manager")
        resp = client.post(URL, VALID_BODY, format="json")
        assert resp.status_code == 402
