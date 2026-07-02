"""Async generate-draft endpoint (Sprint-6A-06). Returns a job, queues Celery."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.models import AIGenerationJob, JobStatus

pytestmark = pytest.mark.django_db

URL = reverse("ai:questions-generate-draft")

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
    return client, user


@pytest.fixture(autouse=True)
def no_real_queue(monkeypatch):
    """Isolate the endpoint from task execution — assert queueing only."""
    calls = []
    monkeypatch.setattr(
        "ai.api.views.run_ai_generation_job.delay", lambda *a, **k: calls.append(a)
    )
    return calls


class TestAuthAndRbac:
    def test_unauthenticated_401(self):
        assert APIClient().post(URL, VALID_BODY, format="json").status_code == 401

    def test_student_403(self):
        client, _ = _client_with_role("student")
        assert client.post(URL, VALID_BODY, format="json").status_code == 403

    @pytest.mark.parametrize("role", ["content_manager", "platform_admin"])
    def test_operator_gets_202_job_and_queues(self, no_real_queue, role):
        client, user = _client_with_role(role)
        resp = client.post(URL, VALID_BODY, format="json")
        assert resp.status_code == 202
        body = resp.json()
        assert body["status"] == "pending"
        assert body["requested_count"] == 2
        assert body["progress"] == 0

        job = AIGenerationJob.objects.get(id=body["id"])
        assert job.created_by == user
        assert job.status == JobStatus.PENDING
        assert job.request_payload["exam"] == "CTET"
        # The Celery task was queued with the job id.
        assert no_real_queue == [(str(job.id),)]


class TestBatchBounds:
    def test_large_batch_accepted(self, no_real_queue):
        client, _ = _client_with_role("content_manager")
        resp = client.post(URL, {**VALID_BODY, "count": 250}, format="json")
        assert resp.status_code == 202
        assert AIGenerationJob.objects.get().requested_count == 250

    def test_over_max_rejected_400(self):
        client, _ = _client_with_role("content_manager")
        resp = client.post(URL, {**VALID_BODY, "count": 100000}, format="json")
        assert resp.status_code == 400
        assert AIGenerationJob.objects.count() == 0

    def test_missing_field_400(self):
        client, _ = _client_with_role("content_manager")
        body = {k: v for k, v in VALID_BODY.items() if k != "exam"}
        assert client.post(URL, body, format="json").status_code == 400
        assert AIGenerationJob.objects.count() == 0
