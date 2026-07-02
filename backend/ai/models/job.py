"""
AIGenerationJob — async batch generation tracking (Sprint-6A-06).

Large generations (20–500 questions) run through Celery so the HTTP request
returns immediately. This row is the durable handle clients poll: it records the
request, live progress, per-provider outcome, and terminal status. The Celery
task only orchestrates the existing QuestionDraftService — this model owns no
generation logic.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class JobStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class AIGenerationJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_generation_jobs",
    )
    status = models.CharField(
        max_length=12, choices=JobStatus.choices, default=JobStatus.PENDING
    )
    progress = models.PositiveSmallIntegerField(default=0)  # 0–100 (%)
    requested_count = models.PositiveIntegerField(default=0)
    generated_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    # The serialized QuestionGenerationRequest, so the task can rebuild it.
    request_payload = models.JSONField(default=dict)
    provider = models.CharField(max_length=20, blank=True, default="")
    model = models.CharField(max_length=100, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_generation_job"
        verbose_name = "AI Generation Job"
        verbose_name_plural = "AI Generation Jobs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="ix_ai_job_time"),
            models.Index(fields=["status"], name="ix_ai_job_status"),
            models.Index(fields=["created_by", "-created_at"], name="ix_ai_job_user_time"),
        ]

    @property
    def duration_seconds(self) -> float | None:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

    def __str__(self) -> str:
        return f"AIGenerationJob({str(self.id)[:8]}, {self.status}, {self.progress}%)"
