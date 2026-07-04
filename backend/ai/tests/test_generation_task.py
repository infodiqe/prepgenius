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

    def test_task_redelivery_is_idempotent(self, monkeypatch):
        # A Celery retry/redelivery must not regenerate an already-finished job.
        calls = {"n": 0}

        def counting_gen(**kw):
            calls["n"] += 1
            return make_result(text=valid_json(count=2))

        gen = QuestionGenerationService(generate_fn=counting_gen)
        monkeypatch.setattr(
            "ai.generation.job_service.QuestionDraftService",
            lambda: QuestionDraftService(generation_service=gen),
        )
        job = create_generation_job(request=make_request(count=2))

        first = run_ai_generation_job(str(job.id))
        after_first = calls["n"]
        second = run_ai_generation_job(str(job.id))  # redelivery

        assert first == second == str(job.id)
        assert calls["n"] == after_first  # second delivery did no extra work
        assert AIQuestionDraft.objects.count() == 2  # not doubled

    def test_task_marks_failed_on_insufficient_credits(self, monkeypatch):
        # The real gateway raising InsufficientCreditsError must fail the job
        # gracefully (never crash the worker).
        from ai.exceptions import InsufficientCreditsError

        def broke(**kw):
            raise InsufficientCreditsError("Not enough available credits to reserve.")

        gen = QuestionGenerationService(generate_fn=broke)
        monkeypatch.setattr(
            "ai.generation.job_service.QuestionDraftService",
            lambda: QuestionDraftService(generation_service=gen),
        )
        job = create_generation_job(request=make_request(count=2))

        run_ai_generation_job(str(job.id))

        job.refresh_from_db()
        assert job.status == JobStatus.FAILED
        assert "credit" in job.error_message.lower()
        assert AIQuestionDraft.objects.count() == 0
