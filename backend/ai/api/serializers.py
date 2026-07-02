"""
AI question-generation API serializers (Sprint-6A-02).

The **request** serializer performs syntactic validation (required fields, enum
choices, count range) and produces a typed :class:`QuestionGenerationRequest`
DTO. Semantic/business validation (supported question type, supported language)
lives in the service, so the service is safe to call independently of HTTP.

The **response** serializers are read-only and render the service's DTOs to
JSON-only output for the API schema (drf-spectacular) and the wire.
"""
from __future__ import annotations

from django.conf import settings
from rest_framework import serializers

from ai.enums import PromptType
from ai.generation.dto import QuestionGenerationRequest
from ai.generation.enums import (
    MAX_QUESTIONS_PER_REQUEST,
    BloomLevel,
    Difficulty,
    QuestionType,
)
from ai.models import AIQuestionDraft


class QuestionGenerationRequestSerializer(serializers.Serializer):
    exam = serializers.CharField(max_length=200)
    subject = serializers.CharField(max_length=200)
    topic = serializers.CharField(max_length=200)
    subtopic = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    difficulty = serializers.ChoiceField(choices=Difficulty.choices)
    bloom_level = serializers.ChoiceField(choices=BloomLevel.choices)
    # Accepts any declared type; the service rejects not-yet-supported types with
    # a specific "unsupported question type" error.
    question_type = serializers.ChoiceField(choices=QuestionType.choices)
    # Free-form so the service can emit a precise "unsupported language" error.
    language = serializers.CharField(max_length=10)
    count = serializers.IntegerField(min_value=1, max_value=MAX_QUESTIONS_PER_REQUEST)
    additional_instructions = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )

    def to_dto(self) -> QuestionGenerationRequest:
        data = self.validated_data
        return QuestionGenerationRequest(
            exam=data["exam"].strip(),
            subject=data["subject"].strip(),
            topic=data["topic"].strip(),
            subtopic=(data.get("subtopic") or "").strip() or None,
            difficulty=data["difficulty"],
            bloom_level=data["bloom_level"],
            question_type=data["question_type"],
            language=data["language"].strip(),
            count=data["count"],
            additional_instructions=(data.get("additional_instructions") or "").strip()
            or None,
        )


class QuestionOptionSerializer(serializers.Serializer):
    label = serializers.CharField()
    text = serializers.CharField()
    is_correct = serializers.BooleanField()


class GeneratedQuestionSerializer(serializers.Serializer):
    stem = serializers.CharField()
    options = QuestionOptionSerializer(many=True)
    correct_answer = serializers.CharField()
    explanation = serializers.CharField(allow_blank=True)
    difficulty = serializers.CharField()
    bloom_level = serializers.CharField()
    estimated_time_seconds = serializers.IntegerField()
    tags = serializers.ListField(child=serializers.CharField())
    learning_objective = serializers.CharField(allow_blank=True)
    language = serializers.CharField()
    question_type = serializers.CharField()
    source = serializers.CharField()
    confidence_score = serializers.FloatField(allow_null=True)


class QuestionGenerationResponseSerializer(serializers.Serializer):
    questions = GeneratedQuestionSerializer(many=True)
    count = serializers.IntegerField()
    provider = serializers.CharField(allow_null=True)
    model = serializers.CharField(allow_null=True)
    request_id = serializers.CharField(allow_null=True)


# ── Draft persistence (Sprint-6A-04) ─────────────────────────────────────────


class ValidationIssueSerializer(serializers.Serializer):
    code = serializers.CharField()
    severity = serializers.CharField()
    field = serializers.CharField()
    message = serializers.CharField()


class AIQuestionDraftSerializer(serializers.Serializer):
    """Read view of a persisted draft (renders a DraftDTO)."""

    id = serializers.CharField()
    status = serializers.CharField()
    exam = serializers.CharField()
    subject = serializers.CharField()
    topic = serializers.CharField()
    subtopic = serializers.CharField(allow_null=True)
    question_type = serializers.CharField()
    difficulty = serializers.CharField()
    bloom_level = serializers.CharField()
    language = serializers.CharField()
    stem = serializers.CharField()
    options = serializers.ListField(child=serializers.DictField())
    correct_answer = serializers.CharField(allow_blank=True)
    explanation = serializers.CharField(allow_blank=True)
    learning_objective = serializers.CharField(allow_blank=True)
    estimated_time = serializers.IntegerField()
    tags = serializers.ListField(child=serializers.CharField())
    confidence = serializers.FloatField(allow_null=True)
    provider = serializers.CharField(allow_blank=True)
    model = serializers.CharField(allow_blank=True)
    created_at = serializers.CharField()


class RejectedQuestionSerializer(serializers.Serializer):
    """A generated question that failed validation and was NOT saved."""

    valid = serializers.BooleanField()
    errors = ValidationIssueSerializer(many=True)
    warnings = ValidationIssueSerializer(many=True)
    normalized_question = GeneratedQuestionSerializer()


class DraftGenerationResponseSerializer(serializers.Serializer):
    drafts = AIQuestionDraftSerializer(many=True)
    rejected = RejectedQuestionSerializer(many=True)
    counts = serializers.DictField(child=serializers.IntegerField())
    provider = serializers.CharField(allow_null=True)
    model = serializers.CharField(allow_null=True)
    request_id = serializers.CharField(allow_null=True)


# ── Draft import into the Question pipeline (Sprint-6A-05) ────────────────────


class DraftImportRequestSerializer(serializers.Serializer):
    """Operator supplies the target exam + subtopic for the created Question."""

    exam_id = serializers.UUIDField()
    subtopic_id = serializers.UUIDField()


class DraftImportResponseSerializer(serializers.Serializer):
    question_id = serializers.CharField()
    draft_id = serializers.CharField()
    review_status = serializers.CharField()
    origin = serializers.CharField()
    imported_at = serializers.CharField()


# ── Async batch generation (Sprint-6A-06) ────────────────────────────────────


class BatchDraftGenerationRequestSerializer(QuestionGenerationRequestSerializer):
    """
    Same request as synchronous generation, but ``count`` may be a large batch
    (executed asynchronously via Celery). Reuses ``to_dto`` from the base.
    """

    count = serializers.IntegerField(min_value=1, max_value=settings.AI_MAX_BATCH_QUESTIONS)


class AIGenerationJobSerializer(serializers.Serializer):
    id = serializers.CharField()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    requested_count = serializers.IntegerField()
    generated_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    provider = serializers.CharField(allow_blank=True)
    model = serializers.CharField(allow_blank=True)
    error_message = serializers.CharField(allow_blank=True)
    duration_seconds = serializers.FloatField(allow_null=True)
    started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()


# ── Draft read + management (Sprint-6A-07) ───────────────────────────────────


def _created_by_email(obj) -> str | None:
    return obj.created_by.email if obj.created_by_id else None


class AIQuestionDraftListSerializer(serializers.ModelSerializer):
    """Lightweight row for the draft-management table (no heavy fields)."""

    created_by_email = serializers.SerializerMethodField()

    class Meta:
        model = AIQuestionDraft
        fields = (
            "id",
            "status",
            "exam",
            "subject",
            "topic",
            "question_type",
            "difficulty",
            "bloom_level",
            "language",
            "stem",
            "provider",
            "model",
            "imported_question",
            "created_by_email",
            "created_at",
        )

    def get_created_by_email(self, obj) -> str | None:
        return _created_by_email(obj)


class AIQuestionDraftDetailSerializer(serializers.ModelSerializer):
    """Full draft for the preview panel."""

    created_by_email = serializers.SerializerMethodField()
    prompt_type = serializers.SerializerMethodField()

    class Meta:
        model = AIQuestionDraft
        fields = (
            "id",
            "status",
            "exam",
            "subject",
            "topic",
            "subtopic",
            "question_type",
            "prompt_type",
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
            "provider",
            "model",
            "generation_prompt",
            "validation_report",
            "imported_question",
            "imported_at",
            "created_by_email",
            "created_at",
            "updated_at",
        )

    def get_created_by_email(self, obj) -> str | None:
        return _created_by_email(obj)

    def get_prompt_type(self, obj) -> str:
        # Drafts are always produced by the question-generation prompt.
        return PromptType.QUESTION_GENERATION.value
