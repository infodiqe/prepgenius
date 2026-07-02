"""
AI generation job service (Sprint-6A-06).

Two responsibilities, both thin:

* :func:`create_generation_job` — persist a job row (status=pending) capturing the
  request so it can be replayed asynchronously.
* :func:`run_generation_job` — the orchestration the Celery task delegates to. It
  chunks the requested count into ``AI_GENERATION_BATCH_SIZE`` slices and calls the
  EXISTING :class:`QuestionDraftService` for each, updating live progress. It
  contains **no** generation/validation/persistence logic — that all lives in the
  reused services. Failures mark the job ``failed`` (never crash the worker);
  drafts already persisted by earlier chunks are kept (partial batch progress).
"""
from __future__ import annotations

from dataclasses import asdict, replace
from typing import Any
from uuid import UUID

from django.conf import settings
from django.utils import timezone

from ai.generation.draft_service import QuestionDraftService
from ai.generation.dto import QuestionGenerationRequest


def create_generation_job(
    *,
    request: QuestionGenerationRequest,
    created_by: Any | None = None,
):
    from ai.models import AIGenerationJob, JobStatus

    return AIGenerationJob.objects.create(
        created_by=created_by,
        status=JobStatus.PENDING,
        requested_count=request.count,
        request_payload=asdict(request),
    )


def run_generation_job(*, job_id: UUID, draft_service: QuestionDraftService | None = None):
    """Execute a pending job. Idempotent: only ``pending`` jobs are processed."""
    from ai.models import AIGenerationJob, JobStatus

    job = AIGenerationJob.objects.filter(pk=job_id).first()
    if job is None or job.status != JobStatus.PENDING:
        return job

    service = draft_service or QuestionDraftService()
    request = QuestionGenerationRequest(**job.request_payload)

    job.status = JobStatus.RUNNING
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at", "updated_at"])

    batch_size = max(1, int(getattr(settings, "AI_GENERATION_BATCH_SIZE", 20)))
    total = job.requested_count
    remaining = total
    generated = 0
    failed = 0

    try:
        while remaining > 0:
            n = min(batch_size, remaining)
            result = service.generate_draft(
                replace(request, count=n), created_by=job.created_by
            )
            generated += result.saved_count
            failed += result.rejected_count
            if result.provider:
                job.provider = result.provider
            if result.model:
                job.model = result.model
            remaining -= n
            job.generated_count = generated
            job.failed_count = failed
            job.progress = int((total - remaining) / total * 100) if total else 100
            job.save(
                update_fields=[
                    "generated_count",
                    "failed_count",
                    "progress",
                    "provider",
                    "model",
                    "updated_at",
                ]
            )
    except Exception as exc:  # noqa: BLE001 - failure is captured on the job, not raised
        job.status = JobStatus.FAILED
        job.error_message = str(exc)
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
        return job

    job.status = JobStatus.COMPLETED
    job.progress = 100
    job.completed_at = timezone.now()
    job.save(update_fields=["status", "progress", "completed_at", "updated_at"])
    return job
