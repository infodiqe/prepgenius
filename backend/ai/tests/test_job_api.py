import uuid

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.models import AIGenerationJob, JobStatus

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


def _job(user, **kw):
    return AIGenerationJob.objects.create(created_by=user, requested_count=5, **kw)


class TestJobDetail:
    def test_owner_gets_progress(self):
        client, user = _client_with_role("content_manager")
        job = _job(user, status=JobStatus.RUNNING, progress=40, generated_count=2)
        resp = client.get(reverse("ai:job-detail", kwargs={"job_id": job.id}))
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "running"
        assert body["progress"] == 40
        assert body["generated_count"] == 2

    def test_other_users_job_is_404(self):
        client, _ = _client_with_role("content_manager")
        other = UserFactory()
        job = _job(other)
        resp = client.get(reverse("ai:job-detail", kwargs={"job_id": job.id}))
        assert resp.status_code == 404

    def test_missing_job_404(self):
        client, _ = _client_with_role("content_manager")
        resp = client.get(reverse("ai:job-detail", kwargs={"job_id": uuid.uuid4()}))
        assert resp.status_code == 404

    def test_unauthenticated_401(self):
        job = _job(UserFactory())
        resp = APIClient().get(reverse("ai:job-detail", kwargs={"job_id": job.id}))
        assert resp.status_code == 401

    def test_student_403(self):
        client, user = _client_with_role("student")
        job = _job(user)
        resp = client.get(reverse("ai:job-detail", kwargs={"job_id": job.id}))
        assert resp.status_code == 403


class TestJobList:
    def test_lists_only_own_jobs(self):
        client, user = _client_with_role("content_manager")
        _job(user)
        _job(user)
        _job(UserFactory())  # someone else's
        resp = client.get(reverse("ai:job-list"))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_student_403(self):
        client, _ = _client_with_role("student")
        assert client.get(reverse("ai:job-list")).status_code == 403
