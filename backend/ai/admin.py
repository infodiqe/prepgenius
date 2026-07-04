"""
AI Gateway admin (Sprint-6A-01).

:class:`ai.models.AIRequest` is an audit log written exclusively by the gateway
service. It is registered READ-ONLY: operators can list, filter, search, and
inspect calls (provider health, latency, token usage, cost) but can never create,
edit, or delete rows — mirroring the credits/content-review audit admins. Access
is gated by Django's standard staff/superuser + model view permission (RBAC).
"""
from django.contrib import admin

from ai.models import (
    AIDraftRegeneration,
    AIGenerationJob,
    AIQuestionDraft,
    AIRequest,
    AITaxonomyResolution,
    ProviderHealth,
)


class _ReadOnlyAdmin(admin.ModelAdmin):
    """View-only admin for service-owned audit records."""

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(AIRequest)
class AIRequestAdmin(_ReadOnlyAdmin):
    list_display = (
        "created_at",
        "prompt_type",
        "provider",
        "model",
        "status",
        "total_tokens",
        "cost",
        "latency_ms",
        "attempts",
        "created_by",
    )
    list_filter = ("status", "provider", "prompt_type")
    search_fields = ("model", "error", "created_by__email")
    readonly_fields = (
        "id",
        "provider",
        "model",
        "prompt_type",
        "input",
        "output",
        "status",
        "latency_ms",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "cost",
        "attempts",
        "error",
        "created_by",
        "created_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"


@admin.register(AIQuestionDraft)
class AIQuestionDraftAdmin(_ReadOnlyAdmin):
    """
    Read-only admin for AI question drafts (Sprint-6A-04). Drafts are written
    exclusively by the QuestionDraftService; editing/review/publishing are out of
    scope for this sprint, so the admin is inspect-only.
    """

    @admin.display(description="Duplicate %")
    def duplicate_pct(self, obj) -> str:
        report = obj.quality_report or {}
        dup = report.get("duplicate") or {}
        pct = dup.get("similarity_pct")
        return "—" if pct is None else f"{pct:.1f}%"

    list_display = (
        "created_at",
        "exam",
        "subject",
        "topic",
        "difficulty",
        "language",
        "status",
        # ── Quality (6B-03, Task 12) ─────────────────────────────────────────
        "quality_score",
        "quality_grade",
        "duplicate_pct",
        "analysed_at",
        "imported_question",
        "provider",
        "model",
        "created_by",
    )
    list_filter = (
        "status",
        "quality_grade",
        "duplicate_status",
        "alignment_status",
        "difficulty_match",
        "bloom_match",
        "exam",
        "subject",
        "topic",
        "difficulty",
        "language",
        "created_at",
    )
    search_fields = ("provider", "model", "created_by__email", "status")
    readonly_fields = (
        "id",
        "exam",
        "subject",
        "topic",
        "subtopic",
        "question_type",
        "difficulty",
        "bloom_level",
        "language",
        "stem",
        "options",
        "correct_answer",
        "explanation",
        "learning_objective",
        "estimated_time",
        "tags",
        "confidence",
        "generation_prompt",
        "provider",
        "model",
        "validation_report",
        "status",
        "quality_score",
        "quality_grade",
        "duplicate_status",
        "alignment_status",
        "bloom_match",
        "difficulty_match",
        "quality_report",
        "analysis_version",
        "analysis_provider",
        "analysed_at",
        "imported_question",
        "imported_at",
        "created_by",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"


@admin.register(ProviderHealth)
class ProviderHealthAdmin(_ReadOnlyAdmin):
    """
    Read-only admin for provider reliability + circuit state (Sprint-6B-01).
    Rows are maintained exclusively by the gateway's metrics/circuit services;
    operators inspect health here but never edit it.
    """

    @admin.display(description="Success rate")
    def success_rate_display(self, obj) -> str:
        return f"{obj.success_rate:.0%}"

    list_display = (
        "provider",
        "circuit_state",
        "success_rate_display",
        "success_count",
        "failure_count",
        "timeout_count",
        "retry_count",
        "consecutive_failures",
        "last_success_at",
        "last_failure_at",
    )
    list_filter = ("circuit_state", "provider")
    search_fields = ("provider",)
    readonly_fields = (
        "id",
        "provider",
        "success_count",
        "failure_count",
        "timeout_count",
        "retry_count",
        "consecutive_failures",
        "circuit_state",
        "opened_at",
        "last_success_at",
        "last_failure_at",
        "created_at",
        "updated_at",
    )
    ordering = ("provider",)


@admin.register(AIDraftRegeneration)
class AIDraftRegenerationAdmin(_ReadOnlyAdmin):
    """
    Read-only admin for the append-only draft version history (Sprint-6B-02).
    Rows are written exclusively by the DraftRegenerationService and are never
    edited or deleted — the immutable audit of who/when/provider/model/tokens/
    cost/feedback per version.
    """

    list_display = (
        "created_at",
        "draft",
        "version",
        "is_original",
        "review_action",
        "provider",
        "model",
        "total_tokens",
        "cost",
        "created_by",
    )
    list_filter = ("is_original", "review_action", "provider", "created_at")
    search_fields = ("draft__id", "provider", "model", "created_by__email", "feedback")
    readonly_fields = (
        "id",
        "draft",
        "version",
        "is_original",
        "review_action",
        "stem",
        "options",
        "correct_answer",
        "explanation",
        "difficulty",
        "bloom_level",
        "learning_objective",
        "estimated_time",
        "tags",
        "confidence",
        "language",
        "question_type",
        "provider",
        "model",
        "generation_prompt",
        "feedback",
        "validation_report",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "cost",
        "request_id",
        "quality_before",
        "quality_after",
        "created_by",
        "created_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"


@admin.register(AITaxonomyResolution)
class AITaxonomyResolutionAdmin(_ReadOnlyAdmin):
    """
    Read-only admin for the append-only import-taxonomy audit (Sprint-6C-01, Task 7):
    the AI suggestion, the reviewer's chosen taxonomy, the confidence, and the
    override flag. Rows are written exclusively by the taxonomy service.
    """

    list_display = (
        "created_at",
        "draft",
        "confidence",
        "suggested_exam",
        "chosen_exam",
        "chosen_subtopic",
        "is_override",
        "imported_question",
        "created_by",
    )
    list_filter = ("confidence", "is_override", "created_at")
    search_fields = ("draft__id", "created_by__email")
    readonly_fields = (
        "id",
        "draft",
        "suggested_exam",
        "suggested_subtopic",
        "confidence",
        "suggestion",
        "chosen_exam",
        "chosen_subtopic",
        "is_override",
        "imported_question",
        "created_by",
        "created_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"


@admin.register(AIGenerationJob)
class AIGenerationJobAdmin(_ReadOnlyAdmin):
    """Read-only admin for async generation jobs (Sprint-6A-06)."""

    @admin.display(description="Duration (s)")
    def duration(self, obj) -> str:
        seconds = obj.duration_seconds
        return "—" if seconds is None else f"{seconds:.1f}"

    list_display = (
        "created_at",
        "status",
        "progress",
        "duration",
        "requested_count",
        "generated_count",
        "failed_count",
        "provider",
        "model",
        "created_by",
    )
    list_filter = ("status", "provider", "created_at")
    search_fields = ("provider", "model", "created_by__email", "error_message")
    readonly_fields = (
        "id",
        "created_by",
        "status",
        "progress",
        "requested_count",
        "generated_count",
        "failed_count",
        "request_payload",
        "provider",
        "model",
        "error_message",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
