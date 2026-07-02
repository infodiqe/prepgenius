import uuid

import pytest

from ai.generation.draft_service import QuestionDraftService
from ai.generation.job_service import create_generation_job
from ai.generation.service import QuestionGenerationService
from ai.models import AIQuestionDraft, JobStatus
from ai.tasks import run_ai_generation_job
from ai.tests.generation_utils import make_request, make_result, valid_json

pytestmark = pytest.mark.django_db


class TestGenerationTask:
    def test_task_runs_job_end_to_end(self, monkeypatch):
        # The task only orchestrates; make the underlying draft service use a
        # mocked gateway so no live call happens.
        gen = QuestionGenerationService(generate_fn=lambda **kw: make_result(text=valid_json(count=2)))
        monkeypatch.setattr(
            "ai.generation.job_service.QuestionDraftService",
            lambda: QuestionDraftService(generation_service=gen),
        )
        job = create_generation_job(request=make_request(count=2))

        returned = run_ai_generation_job(str(job.id))

        assert returned == str(job.id)
        job.refresh_from_db()
        assert job.status == JobStatus.COMPLETED
        assert job.generated_count == 2
        assert AIQuestionDraft.objects.count() == 2

    def test_task_marks_failed_on_provider_error(self, monkeypatch):
        gen = QuestionGenerationService(
            generate_fn=lambda **kw: make_result(success=False, error="all providers failed")
        )
        monkeypatch.setattr(
            "ai.generation.job_service.QuestionDraftService",
            lambda: QuestionDraftService(generation_service=gen),
        )
        job = create_generation_job(request=make_request(count=2))

        run_ai_generation_job(str(job.id))

        job.refresh_from_db()
        assert job.status == JobStatus.FAILED
        assert job.error_message
        assert AIQuestionDraft.objects.count() == 0

    def test_task_with_missing_job_returns_empty(self):
        assert run_ai_generation_job(str(uuid.uuid4())) == ""
