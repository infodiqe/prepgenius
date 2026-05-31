from rest_framework import serializers

from questions.models import (
    AiGeneratedQuestion,
    Question,
    QuestionAppearance,
    QuestionOption,
    QuestionStat,
)

_QUESTION_ORIGIN_CHOICES = ["official", "ai", "manual"]
_QUESTION_REVIEW_STATUS_CHOICES = [
    "draft",
    "in_review",
    "sme_review",
    "approved",
    "published",
    "rejected",
]
_AI_GEN_STATUS_CHOICES = ["generated", "validated", "promoted", "discarded"]


# ── QuestionOption ────────────────────────────────────────────────────


class QuestionOptionNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "label", "body", "is_correct", "position"]


class QuestionOptionReadSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = QuestionOption
        fields = ["id", "question_id", "label", "body", "is_correct", "position"]


class QuestionOptionCreateSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(help_text="ID of the parent question")

    class Meta:
        model = QuestionOption
        fields = ["question_id", "label", "body", "is_correct", "position"]
        extra_kwargs = {
            "is_correct": {"required": False, "default": False},
            "position": {"required": False, "default": 0},
        }


class QuestionOptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["label", "body", "is_correct", "position"]
        extra_kwargs = {field: {"required": False} for field in fields}


# ── Question ──────────────────────────────────────────────────────────


class QuestionReadSerializer(serializers.ModelSerializer):
    exam_id = serializers.UUIDField(read_only=True)
    subtopic_id = serializers.UUIDField(read_only=True)
    verified_by_id = serializers.UUIDField(read_only=True, allow_null=True)
    options = QuestionOptionNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "exam_id",
            "subtopic_id",
            "stem",
            "explanation",
            "difficulty",
            "language",
            "origin",
            "review_status",
            "verified_by_id",
            "tags",
            "options",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class QuestionCreateSerializer(serializers.ModelSerializer):
    exam_id = serializers.UUIDField(
        help_text="ID of the exam this question belongs to"
    )
    subtopic_id = serializers.UUIDField(
        help_text="ID of the subtopic this question tests"
    )
    origin = serializers.ChoiceField(
        choices=_QUESTION_ORIGIN_CHOICES,
        required=False,
        default="manual",
        help_text="Origin of the question: official, ai, or manual",
    )

    class Meta:
        model = Question
        fields = [
            "exam_id",
            "subtopic_id",
            "stem",
            "explanation",
            "difficulty",
            "language",
            "origin",
            "tags",
        ]
        extra_kwargs = {
            "explanation": {"required": False, "allow_null": True},
            "difficulty": {"required": False, "default": 2},
            "language": {"required": False, "default": "as"},
            "tags": {"required": False},
        }


class QuestionUpdateSerializer(serializers.ModelSerializer):
    subtopic_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID of the subtopic this question tests",
    )

    class Meta:
        model = Question
        fields = [
            "stem",
            "explanation",
            "difficulty",
            "language",
            "subtopic_id",
            "tags",
        ]
        extra_kwargs = {
            "stem": {"required": False},
            "explanation": {"required": False, "allow_null": True},
            "difficulty": {"required": False},
            "language": {"required": False},
            "tags": {"required": False},
        }


# ── QuestionAppearance ────────────────────────────────────────────────


class QuestionAppearanceReadSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(read_only=True)
    paper_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = QuestionAppearance
        fields = ["id", "question_id", "paper_id", "year"]


class QuestionAppearanceCreateSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(help_text="ID of the question")
    paper_id = serializers.UUIDField(help_text="ID of the previous year paper")

    class Meta:
        model = QuestionAppearance
        fields = ["question_id", "paper_id", "year"]


class QuestionAppearanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionAppearance
        fields = ["year"]
        extra_kwargs = {"year": {"required": False}}


# ── QuestionStat ──────────────────────────────────────────────────────


class QuestionStatReadSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = QuestionStat
        fields = [
            "question_id",
            "attempts",
            "correct",
            "success_rate",
            "avg_time_seconds",
            "updated_at",
        ]
        read_only_fields = fields


# ── AiGeneratedQuestion ───────────────────────────────────────────────


class AiGeneratedQuestionReadSerializer(serializers.ModelSerializer):
    exam_id = serializers.UUIDField(read_only=True)
    subtopic_id = serializers.UUIDField(read_only=True, allow_null=True)
    resulting_question_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta:
        model = AiGeneratedQuestion
        fields = [
            "id",
            "exam_id",
            "subtopic_id",
            "generation_batch",
            "model_used",
            "status",
            "resulting_question_id",
            "created_at",
        ]
        read_only_fields = fields


class AiGeneratedQuestionCreateSerializer(serializers.ModelSerializer):
    exam_id = serializers.UUIDField(help_text="ID of the target exam")
    subtopic_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID of the subtopic (if scoped)",
    )
    generation_batch = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Batch UUID for grouping multiple generations",
    )

    class Meta:
        model = AiGeneratedQuestion
        fields = [
            "exam_id",
            "subtopic_id",
            "model_used",
            "generation_batch",
            "prompt",
            "constraints_snapshot",
            "raw_output",
            "validation",
            "credits_charged",
        ]
        extra_kwargs = {
            "model_used": {"required": True},
            "prompt": {"required": False, "allow_null": True},
            "constraints_snapshot": {"required": False},
            "raw_output": {"required": False, "allow_null": True},
            "validation": {"required": False},
            "credits_charged": {"required": False, "default": 0},
        }


class AiGeneratedPromoteSerializer(serializers.Serializer):
    stem = serializers.CharField()
    subtopic_id = serializers.UUIDField(help_text="ID of the subtopic")
    explanation = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )
    difficulty = serializers.IntegerField(required=False, default=2)
    language = serializers.CharField(required=False, default="as")
    tags = serializers.JSONField(required=False)


class AiGeneratedQuestionUpdateSerializer(serializers.ModelSerializer):
    subtopic_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID of the subtopic (if scoped)",
    )
    generation_batch = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Batch UUID for grouping multiple generations",
    )
    status = serializers.ChoiceField(
        choices=_AI_GEN_STATUS_CHOICES,
        required=False,
        help_text="Status: generated, validated, promoted, or discarded",
    )

    class Meta:
        model = AiGeneratedQuestion
        fields = [
            "subtopic_id",
            "model_used",
            "generation_batch",
            "prompt",
            "constraints_snapshot",
            "raw_output",
            "validation",
            "credits_charged",
            "status",
        ]
        extra_kwargs = {
            "model_used": {"required": False},
            "prompt": {"required": False, "allow_null": True},
            "constraints_snapshot": {"required": False},
            "raw_output": {"required": False, "allow_null": True},
            "validation": {"required": False},
            "credits_charged": {"required": False},
        }
