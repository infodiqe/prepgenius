"""
AI generation Celery tasks (Sprint-6A-06).

The task is a thin, retry-safe orchestrator: it delegates entirely to
:func:`ai.generation.job_service.run_generation_job`, which reuses the existing
QuestionDraftService. No generation/validation/persistence logic lives here.
Routed to the ``ai`` queue via the ``ai.*`` route in settings.
"""
from __future__ import annotations

from celery import shared_task


@shared_task(name="ai.tasks.run_ai_generation_job")
def run_ai_generation_job(job_id: str) -> str:
    from ai.generation.job_service import run_generation_job

    job = run_generation_job(job_id=job_id)
    return str(job.id) if job is not None else ""
