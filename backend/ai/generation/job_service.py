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
from django.db import transaction
from django.utils import timezone

from ai.generation.draft_service import QuestionDraftService
from ai.generation.dto import QuestionGenerationRequest
from ai.generation.enums import MAX_QUESTIONS_PER_REQUEST


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


def _claim_job(job_id: UUID):
    """
    Atomically transition a job ``pending → running`` under a row lock so that
    exactly one worker can ever claim it (Sprint-6B-01, Task 1). Returns the
    claimed job, or ``None`` if it does not exist or is not ``pending`` (already
    claimed / finished — the caller treats this as a no-op, giving idempotency and
    Celery-retry safety). ``select_for_update`` serializes concurrent workers: the
    second to arrive blocks until the first commits, then reads ``running`` and is
    turned away here rather than double-processing.
    """
    from ai.models import AIGenerationJob, JobStatus

    with transaction.atomic():
        job = (
            AIGenerationJob.objects.select_for_update()
            .filter(pk=job_id)
            .first()
        )
        if job is None or job.status != JobStatus.PENDING:
            return None
        job.status = JobStatus.RUNNING
        job.started_at = timezone.now()
        job.save(update_fields=["status", "started_at", "updated_at"])
        return job


def run_generation_job(*, job_id: UUID, draft_service: QuestionDraftService | None = None):
    """Execute a pending job. Idempotent: only ``pending`` jobs are processed."""
    from ai.models import AIGenerationJob, JobStatus

    job = _claim_job(job_id)
    if job is None:
        # Not found, or already claimed/finished by another worker → no-op.
        return AIGenerationJob.objects.filter(pk=job_id).first()

    service = draft_service or QuestionDraftService()
    request = QuestionGenerationRequest(**job.request_payload)

    # Each chunk becomes a QuestionDraftService call, which rejects counts above
    # MAX_QUESTIONS_PER_REQUEST. Clamp so a misconfigured AI_GENERATION_BATCH_SIZE
    # (> the per-request cap) can never make every chunk fail — enforcing the
    # documented "each call is bounded by MAX_QUESTIONS_PER_REQUEST" contract.
    batch_size = max(
        1,
        min(int(getattr(settings, "AI_GENERATION_BATCH_SIZE", 20)), MAX_QUESTIONS_PER_REQUEST),
    )
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
