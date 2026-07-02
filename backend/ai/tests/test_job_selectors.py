import uuid

import pytest

from accounts.tests.factories import UserFactory
from ai.models import AIGenerationJob
from ai.selectors import get_ai_job, list_ai_jobs

pytestmark = pytest.mark.django_db


def _job(user):
    return AIGenerationJob.objects.create(created_by=user, requested_count=3)


class TestGetAiJob:
    def test_found_unscoped(self):
        job = _job(UserFactory())
        assert get_ai_job(job_id=job.id) == job

    def test_owner_scope(self):
        user = UserFactory()
        job = _job(user)
        assert get_ai_job(job_id=job.id, user=user) == job
        assert get_ai_job(job_id=job.id, user=UserFactory()) is None

    def test_missing(self):
        assert get_ai_job(job_id=uuid.uuid4()) is None


class TestListAiJobs:
    def test_scoped_newest_first(self):
        user = UserFactory()
        a = _job(user)
        b = _job(user)
        _job(UserFactory())
        rows = list(list_ai_jobs(user=user))
        assert rows == [b, a]
