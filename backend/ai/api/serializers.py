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

from ai.enums import Provider, PromptType
from ai.generation.dto import QuestionGenerationRequest
from ai.generation.enums import (
    MAX_QUESTIONS_PER_REQUEST,
    BloomLevel,
    Difficulty,
    QuestionType,
)
from ai.models import AIDraftRegeneration, AIQuestionDraft, AITaxonomyResolution
from ai.review.enums import ReviewAction


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
            # ── Quality badges (6B-03) ───────────────────────────────────────
            "quality_score",
            "quality_grade",
            "duplicate_status",
            "alignment_status",
            "bloom_match",
            "difficulty_match",
            "analysed_at",
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
            # ── Quality report (6B-03) — expandable panel + badges ───────────
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
        )

    def get_created_by_email(self, obj) -> str | None:
        return _created_by_email(obj)

    def get_prompt_type(self, obj) -> str:
        # Drafts are always produced by the question-generation prompt.
        return PromptType.QUESTION_GENERATION.value


# ── Draft regeneration / versioning (Sprint-6B-02) ───────────────────────────

# Operator provider override (Task 5): "auto" = the configured fallback chain
# (default). "anthropic" surfaces to operators as "Claude".
_PROVIDER_OVERRIDE_CHOICES = ["auto", *Provider.values]


class DraftRegenerateRequestSerializer(serializers.Serializer):
    """Optional operator feedback + provider override for a single regeneration."""

    feedback = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        help_text="Optional guidance that augments the prompt (never replaces the "
        "system prompt), e.g. 'Make harder', 'Reduce ambiguity'.",
    )
    provider = serializers.ChoiceField(
        choices=_PROVIDER_OVERRIDE_CHOICES,
        required=False,
        allow_blank=True,
        allow_null=True,
        default="auto",
        help_text="Provider to use for THIS regeneration only. 'auto' (default) "
        "uses the configured fallback chain.",
    )


class DraftRollbackRequestSerializer(serializers.Serializer):
    """Restore the draft's content to an earlier version."""

    version = serializers.IntegerField(min_value=1)


class AIDraftRegenerationSerializer(serializers.ModelSerializer):
    """One immutable version snapshot (history + audit; Tasks 3/7)."""

    created_by_email = serializers.SerializerMethodField()

    class Meta:
        model = AIDraftRegeneration
        fields = (
            "id",
            "version",
            "is_original",
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
            # ── Review-assistant audit (6B-04) ───────────────────────────────
            "review_action",
            "quality_before",
            "quality_after",
            "created_by_email",
            "created_at",
        )

    def get_created_by_email(self, obj) -> str | None:
        return obj.created_by.email if obj.created_by_id else None


class RegenerationOutcomeSerializer(serializers.Serializer):
    """The updated draft plus the new version it produced."""

    draft = AIQuestionDraftDetailSerializer()
    regeneration = AIDraftRegenerationSerializer()


class VersionDiffFieldSerializer(serializers.Serializer):
    changed = serializers.BooleanField()
    previous = serializers.JSONField(allow_null=True)
    current = serializers.JSONField()


class VersionCompareSerializer(serializers.Serializer):
    """Backend-only diff of two versions (Task 4)."""

    current_version = serializers.IntegerField()
    previous_version = serializers.IntegerField(allow_null=True)
    diff = serializers.DictField(child=VersionDiffFieldSerializer())


# ── AI Content Review Assistant (Sprint-6B-04) ───────────────────────────────


class ReviewImproveRequestSerializer(serializers.Serializer):
    """Reviewer picks an action (+ optional instructions / provider override)."""

    action = serializers.ChoiceField(choices=ReviewAction.choices)
    instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Optional reviewer guidance that augments the action prompt "
        "(never replaces the system prompt).",
    )
    provider = serializers.ChoiceField(
        choices=_PROVIDER_OVERRIDE_CHOICES,
        required=False,
        allow_blank=True,
        allow_null=True,
        default="auto",
    )


class ReviewRecommendationSerializer(serializers.Serializer):
    code = serializers.CharField()
    suggested_action = serializers.CharField(allow_blank=True)
    reason = serializers.CharField()
    severity = serializers.CharField()


class ReviewRecommendationsSerializer(serializers.Serializer):
    draft_id = serializers.CharField()
    quality_score = serializers.IntegerField(allow_null=True)
    quality_grade = serializers.CharField(allow_blank=True)
    recommendations = ReviewRecommendationSerializer(many=True)


class QualityComparisonSerializer(serializers.Serializer):
    old_score = serializers.IntegerField()
    new_score = serializers.IntegerField()
    quality_delta = serializers.IntegerField()
    bloom_delta = serializers.DictField()
    difficulty_delta = serializers.DictField()
    duplicate_delta = serializers.DictField()
    alignment_delta = serializers.DictField()
    explanation_delta = serializers.IntegerField()


class ReviewImprovementOutcomeSerializer(serializers.Serializer):
    """The improved draft, the new version it produced, and the quality comparison."""

    draft = AIQuestionDraftDetailSerializer()
    regeneration = AIDraftRegenerationSerializer()
    comparison = QualityComparisonSerializer()


class ReviewActionSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


# ── AI Taxonomy Resolution & Intelligent Import (Sprint-6C-01) ───────────────


class TaxonomyMatchSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    confidence = serializers.CharField()
    score = serializers.FloatField()
    reason = serializers.CharField()


class LevelSuggestionSerializer(serializers.Serializer):
    level = serializers.CharField()
    query = serializers.CharField(allow_blank=True)
    confidence = serializers.CharField()
    best = TaxonomyMatchSerializer(allow_null=True)
    matches = TaxonomyMatchSerializer(many=True)


class TaxonomyResolutionSerializer(serializers.Serializer):
    """Deterministic taxonomy suggestions + the pre-import duplicate check."""

    draft_id = serializers.CharField()
    exam = LevelSuggestionSerializer()
    subject = LevelSuggestionSerializer()
    topic = LevelSuggestionSerializer()
    subtopic = LevelSuggestionSerializer()
    overall_confidence = serializers.CharField()
    suggested_exam_id = serializers.CharField(allow_null=True)
    suggested_subtopic_id = serializers.CharField(allow_null=True)
    duplicates = serializers.DictField()


class TaxonomyAcceptRequestSerializer(serializers.Serializer):
    """The reviewer's chosen taxonomy (suggestion accepted or overridden)."""

    exam_id = serializers.UUIDField()
    subtopic_id = serializers.UUIDField()


class TaxonomyResolutionAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = AITaxonomyResolution
        fields = (
            "id",
            "confidence",
            "suggested_exam",
            "suggested_subtopic",
            "chosen_exam",
            "chosen_subtopic",
            "is_override",
            "imported_question",
            "suggestion",
            "created_at",
        )


class TaxonomyAcceptResponseSerializer(serializers.Serializer):
    """The import result plus the append-only taxonomy audit record."""

    imported = DraftImportResponseSerializer()
    audit = TaxonomyResolutionAuditSerializer()
