"""
AI generation-job selectors — reads only (Sprint-6A-06).

Pure readers over :class:`ai.models.AIGenerationJob`. Job visibility is
owner-scoped: callers only ever see their own jobs.
"""
from __future__ import annotations

from django.db.models import QuerySet

from ai.models import AIGenerationJob


def get_ai_job(*, job_id, user=None) -> AIGenerationJob | None:
    qs = AIGenerationJob.objects.all()
    if user is not None:
        qs = qs.filter(created_by=user)
    return qs.filter(pk=job_id).first()


def list_ai_jobs(*, user) -> QuerySet[AIGenerationJob]:
    return AIGenerationJob.objects.filter(created_by=user).order_by("-created_at")
