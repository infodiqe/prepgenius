"""
AIQuestionDraft — persisted, validated AI question drafts (Sprint-6A-04).

The **quarantine layer** between AI generation and the production question bank:
AI output is NEVER inserted into ``questions.Question`` directly (PRD §7/§8 — AI
content is always Draft and must pass human review before publish). Only questions
that pass the Sprint-6A-03 validation pipeline are persisted here, always with
``status=draft``. Editing, review transitions, and publishing are out of scope for
this sprint (future sprints own those; the wider status enum is defined now so the
schema is stable).
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from ai.enums import Provider
from ai.generation.enums import BloomLevel, Difficulty, QuestionType


class DraftStatus(models.TextChoices):
    """
    AIQuestionDraft lifecycle (Sprint-6A-05).

    A draft is a temporary staging record only — it NEVER runs a review workflow.
    ``generated`` on creation; ``imported`` once bridged into a ``questions.Question``
    (after which it is an immutable audit record); ``discarded`` if abandoned.
    ``reviewed``/``approved``/``published`` intentionally do NOT exist here — the
    Question model owns the single review/approval/publish pipeline (PRD §8).
    """

    GENERATED = "generated", "Generated"
    IMPORTED = "imported", "Imported"
    DISCARDED = "discarded", "Discarded"


class AIQuestionDraft(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ── Generation context (from the request) ────────────────────────────────
    exam = models.CharField(max_length=200)
    subject = models.CharField(max_length=200)
    topic = models.CharField(max_length=200)
    subtopic = models.CharField(max_length=200, null=True, blank=True)
    question_type = models.CharField(max_length=40, choices=QuestionType.choices)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices)
    bloom_level = models.CharField(max_length=20, choices=BloomLevel.choices)
    language = models.CharField(max_length=10)

    # ── Normalized, validated content ────────────────────────────────────────
    stem = models.TextField()
    options = models.JSONField(default=list)
    correct_answer = models.CharField(max_length=10, blank=True, default="")
    explanation = models.TextField(blank=True, default="")
    learning_objective = models.TextField(blank=True, default="")
    estimated_time = models.PositiveIntegerField(default=0)
    tags = models.JSONField(default=list)
    confidence = models.FloatField(null=True, blank=True)

    # ── Provenance / audit ───────────────────────────────────────────────────
    generation_prompt = models.TextField(blank=True, default="")
    provider = models.CharField(max_length=20, choices=Provider.choices, blank=True, default="")
    model = models.CharField(max_length=100, blank=True, default="")
    validation_report = models.JSONField(default=dict)

    status = models.CharField(
        max_length=12, choices=DraftStatus.choices, default=DraftStatus.GENERATED
    )

    # ── Quality intelligence (Sprint-6B-03) ─────────────────────────────────
    # Rule-based quality metadata attached AFTER validation and BEFORE human
    # review. Advisory only — it never rejects/publishes. ``quality_report`` holds
    # the full structured QualityAnalysisResult; the flat columns below are
    # denormalized purely so the workspace/admin can filter server-side (Task 11).
    quality_score = models.PositiveSmallIntegerField(null=True, blank=True)  # 0–100
    quality_grade = models.CharField(max_length=1, blank=True, default="")  # A–F
    duplicate_status = models.CharField(max_length=20, blank=True, default="")
    alignment_status = models.CharField(max_length=20, blank=True, default="")
    bloom_match = models.CharField(max_length=12, blank=True, default="")
    difficulty_match = models.CharField(max_length=12, blank=True, default="")
    quality_report = models.JSONField(default=dict, blank=True)
    analysis_version = models.CharField(max_length=20, blank=True, default="")
    # "rule_based" this sprint; reserved for a future AI-assisted analyser.
    analysis_provider = models.CharField(max_length=20, blank=True, default="")
    analysed_at = models.DateTimeField(null=True, blank=True)

    # ── Regeneration / versioning (Sprint-6B-02) ─────────────────────────────
    # How many times the draft has been regenerated (improved) in place, and when
    # it was last regenerated. ``current_version`` is which snapshot in
    # ``ai_draft_regeneration`` the live fields currently reflect (rollback moves
    # it back to an earlier version). Full per-version history lives in the
    # append-only AIDraftRegeneration table (never overwritten).
    regeneration_count = models.PositiveIntegerField(default=0)
    current_version = models.PositiveIntegerField(default=1)
    regenerated_at = models.DateTimeField(null=True, blank=True)
    # Set once the draft is bridged into the review pipeline. The draft then
    # becomes an immutable audit record linking to the created Question.
    imported_question = models.ForeignKey(
        "questions.Question",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    imported_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_question_drafts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_question_draft"
        verbose_name = "AI Question Draft"
        verbose_name_plural = "AI Question Drafts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="ix_ai_draft_time"),
            models.Index(fields=["status"], name="ix_ai_draft_status"),
            models.Index(fields=["exam"], name="ix_ai_draft_exam"),
            models.Index(fields=["subject"], name="ix_ai_draft_subject"),
            models.Index(fields=["difficulty"], name="ix_ai_draft_difficulty"),
            models.Index(fields=["language"], name="ix_ai_draft_language"),
            models.Index(fields=["created_by", "-created_at"], name="ix_ai_draft_user_time"),
            models.Index(fields=["quality_grade"], name="ix_ai_draft_grade"),
            models.Index(fields=["duplicate_status"], name="ix_ai_draft_dupe"),
        ]

    def __str__(self) -> str:
        return f"AIQuestionDraft({str(self.id)[:8]}, {self.exam}/{self.status})"
