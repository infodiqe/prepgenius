"""
AI Gateway admin (Sprint-6A-01).

:class:`ai.models.AIRequest` is an audit log written exclusively by the gateway
service. It is registered READ-ONLY: operators can list, filter, search, and
inspect calls (provider health, latency, token usage, cost) but can never create,
edit, or delete rows — mirroring the credits/content-review audit admins. Access
is gated by Django's standard staff/superuser + model view permission (RBAC).
"""
from django.contrib import admin

from ai.models import AIGenerationJob, AIQuestionDraft, AIRequest


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

    list_display = (
        "created_at",
        "exam",
        "subject",
        "topic",
        "difficulty",
        "language",
        "status",
        "imported_question",
        "provider",
        "model",
        "created_by",
    )
    list_filter = (
        "status",
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
        "imported_question",
        "imported_at",
        "created_by",
        "created_at",
        "updated_at",
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
