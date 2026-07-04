"""
AIDraftRegeneration — immutable version history for a draft (Sprint-6B-02).

Content Managers may *improve* an existing AI draft without regenerating the whole
batch: each regeneration produces ONE new version of the draft's AI-generated
content, replacing the live fields on :class:`ai.models.AIQuestionDraft` while this
table keeps an **append-only** snapshot of every version (Task 3/7). Nothing here
is ever overwritten — that is what makes version-compare (Task 4) and rollback
(Task 3) possible, and what satisfies the audit requirement (who / when / provider
/ model / tokens / cost / feedback / version).

Version 1 is the original generation (snapshotted lazily on the first regenerate);
each subsequent regeneration is version N+1. Rows are written exclusively by
:class:`ai.generation.regeneration_service.DraftRegenerationService`.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class AIDraftRegeneration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    draft = models.ForeignKey(
        "ai.AIQuestionDraft",
        on_delete=models.CASCADE,
        related_name="regenerations",
    )
    # 1-based, monotonic per draft. Version 1 = the original generation.
    version = models.PositiveIntegerField()
    # True only for the bootstrapped version-1 snapshot of the original content.
    is_original = models.BooleanField(default=False)

    # ── Content snapshot (the AI-generated fields at this version) ────────────
    stem = models.TextField()
    options = models.JSONField(default=list)
    correct_answer = models.CharField(max_length=10, blank=True, default="")
    explanation = models.TextField(blank=True, default="")
    difficulty = models.CharField(max_length=20, blank=True, default="")
    bloom_level = models.CharField(max_length=20, blank=True, default="")
    learning_objective = models.TextField(blank=True, default="")
    estimated_time = models.PositiveIntegerField(default=0)
    tags = models.JSONField(default=list)
    confidence = models.FloatField(null=True, blank=True)
    language = models.CharField(max_length=10, blank=True, default="")
    question_type = models.CharField(max_length=40, blank=True, default="")

    # ── Provenance / audit (Task 7) ──────────────────────────────────────────
    provider = models.CharField(max_length=20, blank=True, default="")
    model = models.CharField(max_length=100, blank=True, default="")
    generation_prompt = models.TextField(blank=True, default="")
    # Optional operator feedback that augmented the prompt (Task 2). Empty for the
    # original snapshot; the collection of these rows IS the feedback history.
    feedback = models.TextField(blank=True, default="")
    validation_report = models.JSONField(default=dict)

    # ── Review-assistant audit (Sprint-6B-04) ────────────────────────────────
    # Set when this version was produced by an AI-assisted review action (empty
    # for plain regenerations / the original). ``quality_before``/``quality_after``
    # store the full quality reports around the improvement so the quality
    # comparison is auditable and never overwritten (Tasks 4 & 8).
    review_action = models.CharField(max_length=40, blank=True, default="")
    quality_before = models.JSONField(default=dict, blank=True)
    quality_after = models.JSONField(default=dict, blank=True)

    # ── Usage / cost (from the gateway AIResult; Task 3/7) ───────────────────
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    cost = models.DecimalField(
        max_digits=12, decimal_places=6, default=Decimal("0")
    )
    # Correlates with the gateway's AIRequest audit row / credit-ledger entries.
    request_id = models.CharField(max_length=64, blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_draft_regenerations",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_draft_regeneration"
        verbose_name = "AI Draft Regeneration"
        verbose_name_plural = "AI Draft Regenerations"
        ordering = ["draft_id", "version"]
        constraints = [
            models.UniqueConstraint(
                fields=["draft", "version"], name="uq_ai_regen_draft_version"
            )
        ]
        indexes = [
            models.Index(fields=["draft", "version"], name="ix_ai_regen_draft_ver"),
            models.Index(fields=["draft", "-created_at"], name="ix_ai_regen_draft_time"),
        ]

    def __str__(self) -> str:
        return f"AIDraftRegeneration({str(self.draft_id)[:8]} v{self.version})"
