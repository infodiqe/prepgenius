import types
import uuid

import pytest

from accounts.tests.factories import UserFactory
from ai.generation.dto import QuestionGenerationRequest
from ai.generation.job_service import create_generation_job, run_generation_job
from ai.generation.service import QuestionGenerationService
from ai.generation.draft_service import QuestionDraftService
from ai.models import AIGenerationJob, AIQuestionDraft, JobStatus
from ai.tests.generation_utils import make_request, make_result, valid_json

pytestmark = pytest.mark.django_db


class StubDraftService:
    """Records chunk sizes; returns a fake result (no persistence)."""

    def __init__(self, *, saved=None, provider="mock", model="mock-model"):
        self.calls: list[int] = []
        self._saved = saved
        self._provider = provider
        self._model = model

    def generate_draft(self, request, *, created_by=None):
        self.calls.append(request.count)
        saved = request.count if self._saved is None else self._saved
        return types.SimpleNamespace(
            saved_count=saved,
            rejected_count=request.count - saved,
            provider=self._provider,
            model=self._model,
        )


class TestCreateJob:
    def test_persists_pending_job_with_payload(self):
        user = UserFactory()
        job = create_generation_job(request=make_request(count=30), created_by=user)
        assert job.status == JobStatus.PENDING
        assert job.requested_count == 30
        assert job.created_by == user
        assert job.request_payload["exam"] == "CTET"
        # Round-trips back into the DTO.
        assert QuestionGenerationRequest(**job.request_payload).count == 30


class TestRunJobSuccess:
    def test_chunks_and_completes(self, settings):
        settings.AI_GENERATION_BATCH_SIZE = 20
        stub = StubDraftService()
        job = create_generation_job(request=make_request(count=45))
        run_generation_job(job_id=job.id, draft_service=stub)

        assert stub.calls == [20, 20, 5]  # chunked to the batch size
        job.refresh_from_db()
        assert job.status == JobStatus.COMPLETED
        assert job.progress == 100
        assert job.generated_count == 45
        assert job.failed_count == 0
        assert job.provider == "mock"
        assert job.model == "mock-model"
        assert job.started_at and job.completed_at

    def test_counts_saved_and_rejected(self, settings):
        settings.AI_GENERATION_BATCH_SIZE = 20
        stub = StubDraftService(saved=15)  # per 20-chunk: 15 saved, 5 rejected
        job = create_generation_job(request=make_request(count=20))
        run_generation_job(job_id=job.id, draft_service=stub)
        job.refresh_from_db()
        assert job.generated_count == 15
        assert job.failed_count == 5


class FlakyDraftService(StubDraftService):
    """Succeeds for the first ``fail_after`` chunks, then raises."""

    def __init__(self, *, fail_after: int, **kw):
        super().__init__(**kw)
        self._fail_after = fail_after

    def generate_draft(self, request, *, created_by=None):
        if len(self.calls) >= self._fail_after:
            self.calls.append(request.count)
            raise RuntimeError("provider down")
        return super().generate_draft(request, created_by=created_by)


class TestRunJobFailure:
    def test_failure_marks_job_and_preserves_partial_progress(self, settings):
        settings.AI_GENERATION_BATCH_SIZE = 20
        # 40 questions → 2 chunks; succeed on chunk 1, fail on chunk 2.
        stub = FlakyDraftService(fail_after=1)
        job = create_generation_job(request=make_request(count=40))
        run_generation_job(job_id=job.id, draft_service=stub)

        job.refresh_from_db()
        assert job.status == JobStatus.FAILED
        assert "provider down" in job.error_message
        assert job.generated_count == 20  # first chunk accounted
        assert job.progress == 50  # 20/40 processed before failure
        assert job.completed_at is not None


class TestIdempotency:
    def test_non_pending_job_is_skipped(self):
        stub = StubDraftService()
        job = create_generation_job(request=make_request(count=10))
        job.status = JobStatus.COMPLETED
        job.save(update_fields=["status"])
        run_generation_job(job_id=job.id, draft_service=stub)
        assert stub.calls == []  # not reprocessed

    def test_missing_job_returns_none(self):
        assert run_generation_job(job_id=uuid.uuid4()) is None


class TestRollbackWithRealService:
    def test_provider_failure_persists_no_drafts(self):
        # Real QuestionDraftService with a failing gateway → generate_draft raises,
        # its transaction rolls back → no drafts, job marked failed.
        gen = QuestionGenerationService(
            generate_fn=lambda **kw: make_result(success=False, error="all providers failed")
        )
        draft_service = QuestionDraftService(generation_service=gen)
        job = create_generation_job(request=make_request(count=2))
        run_generation_job(job_id=job.id, draft_service=draft_service)

        job.refresh_from_db()
        assert job.status == JobStatus.FAILED
        assert AIQuestionDraft.objects.count() == 0

    def test_success_persists_drafts_end_to_end(self):
        gen = QuestionGenerationService(generate_fn=lambda **kw: make_result(text=valid_json(count=2)))
        draft_service = QuestionDraftService(generation_service=gen)
        job = create_generation_job(request=make_request(count=2))
        run_generation_job(job_id=job.id, draft_service=draft_service)

        job.refresh_from_db()
        assert job.status == JobStatus.COMPLETED
        assert job.generated_count == 2
        assert AIQuestionDraft.objects.count() == 2
