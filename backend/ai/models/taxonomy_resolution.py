"""
AITaxonomyResolution — append-only import-taxonomy audit (Sprint-6C-01).

When a reviewer imports an AI draft, the deterministic taxonomy resolver (no AI)
suggests exam/subject/topic/subtopic from the free-text draft context; the reviewer
accepts or overrides, and the chosen taxonomy is used by the EXISTING question
import service. This row records that decision — the AI suggestion, the reviewer's
chosen taxonomy, the confidence, whether it was an override, and when — so it is
**never overwritten** (Task 6). Rows are written exclusively by
:class:`ai.taxonomy.service.AITaxonomyResolutionService`.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class AITaxonomyResolution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    draft = models.ForeignKey(
        "ai.AIQuestionDraft",
        on_delete=models.CASCADE,
        related_name="taxonomy_resolutions",
    )

    # ── AI suggestion (deterministic; the two import-relevant levels) ─────────
    suggested_exam = models.ForeignKey(
        "exams.Exam", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    suggested_subtopic = models.ForeignKey(
        "exams.Subtopic", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    # Overall confidence of the suggestion: exact | partial | no_match.
    confidence = models.CharField(max_length=12, blank=True, default="")
    # Full suggestion snapshot (per-level top matches + reasons + duplicate check).
    suggestion = models.JSONField(default=dict, blank=True)

    # ── Reviewer's chosen taxonomy (what the import actually used) ────────────
    chosen_exam = models.ForeignKey(
        "exams.Exam", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    chosen_subtopic = models.ForeignKey(
        "exams.Subtopic", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    is_override = models.BooleanField(default=False)

    imported_question = models.ForeignKey(
        "questions.Question",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_taxonomy_resolutions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_taxonomy_resolution"
        verbose_name = "AI Taxonomy Resolution"
        verbose_name_plural = "AI Taxonomy Resolutions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["draft", "-created_at"], name="ix_ai_taxres_draft_time"),
            models.Index(fields=["is_override"], name="ix_ai_taxres_override"),
        ]

    def __str__(self) -> str:
        return f"AITaxonomyResolution({str(self.draft_id)[:8]}, {self.confidence})"
