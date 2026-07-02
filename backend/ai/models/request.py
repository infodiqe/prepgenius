"""
AIRequest — audit record for every AI gateway call (Sprint-6A-01, PRD §7).

The gateway writes exactly one row per :func:`ai.services.generate` call: the
provider/model that ultimately handled it (or the last one tried on total
failure), the resolved prompt type + input payload, the output, status, latency,
token usage, and computed cost for margin monitoring. Rows are written only by
the service layer and are read-only in the admin.

``cost`` is a ``NUMERIC`` (never a float — PRD §5) with sub-cent precision, since
per-call costs are fractions of a currency unit.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from ai.enums import PromptType, Provider, RequestStatus


class AIRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=20, choices=Provider.choices)
    model = models.CharField(max_length=100)
    prompt_type = models.CharField(max_length=40, choices=PromptType.choices)
    input = models.JSONField(default=dict, blank=True)
    output = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=10,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
    )
    latency_ms = models.PositiveIntegerField(default=0)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    attempts = models.PositiveIntegerField(default=1)
    error = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_request"
        verbose_name = "AI Request"
        verbose_name_plural = "AI Requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="ix_ai_request_time"),
            models.Index(fields=["provider"], name="ix_ai_request_provider"),
            models.Index(fields=["prompt_type"], name="ix_ai_request_prompt"),
            models.Index(fields=["status"], name="ix_ai_request_status"),
            models.Index(
                fields=["created_by", "-created_at"], name="ix_ai_request_user_time"
            ),
        ]

    def __str__(self) -> str:
        return (
            f"AIRequest({self.prompt_type} via {self.provider}/{self.model}, "
            f"{self.status})"
        )
