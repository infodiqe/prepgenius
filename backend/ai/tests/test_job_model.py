from datetime import timedelta

import pytest
from django.utils import timezone

from ai.models import AIGenerationJob, JobStatus

pytestmark = pytest.mark.django_db


class TestAIGenerationJobModel:
    def test_defaults(self):
        job = AIGenerationJob.objects.create(requested_count=10)
        assert job.status == JobStatus.PENDING
        assert job.progress == 0
        assert job.generated_count == 0
        assert job.failed_count == 0
        assert job.request_payload == {}
        assert job.duration_seconds is None

    def test_duration_seconds(self):
        now = timezone.now()
        job = AIGenerationJob.objects.create(
            requested_count=1, started_at=now, completed_at=now + timedelta(seconds=5)
        )
        assert job.duration_seconds == 5.0

    def test_duration_none_without_both_timestamps(self):
        job = AIGenerationJob.objects.create(requested_count=1, started_at=timezone.now())
        assert job.duration_seconds is None

    def test_str(self):
        job = AIGenerationJob.objects.create(requested_count=1, progress=42)
        assert "42%" in str(job)
        assert "pending" in str(job)
