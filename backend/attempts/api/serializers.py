from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer

_ATTEMPT_TYPE_CHOICES = [
    "topic", "subject", "mixed", "previous_year", "full_mock", "daily"
]
_ATTEMPT_STATUS_CHOICES = [
    "created", "in_progress", "submitted", "scored"
]
_MOCK_TEST_TYPE_CHOICES = [
    "system", "previous_year", "custom"
]
_ANSWER_STATE_CHOICES = [
    "not_visited", "visited", "answered", "marked", "answered_marked"
]


# ── MockTest ──────────────────────────────────────────────────────────────


class MockTestReadSerializer(serializers.ModelSerializer):
    exam_id = serializers.UUIDField(read_only=True)
    institution_id = serializers.UUIDField(read_only=True, allow_null=True)
    created_by_id = serializers.UUIDField(read_only=True, allow_null=True)
    previous_year_paper_id = serializers.UUIDField(
        read_only=True, allow_null=True
    )

    class Meta:
        model = MockTest
        fields = [
            "id",
            "exam_id",
            "name",
            "type",
            "institution_id",
            "created_by_id",
            "previous_year_paper_id",
            "duration_seconds",
            "total_questions",
            "config",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class MockTestCreateSerializer(serializers.ModelSerializer):
    exam_id = serializers.UUIDField(
        help_text="ID of the exam this mock test belongs to"
    )
    type = serializers.ChoiceField(
        choices=_MOCK_TEST_TYPE_CHOICES,
        help_text="Type: system, previous_year, or custom",
    )

    class Meta:
        model = MockTest
        fields = [
            "exam_id",
            "name",
            "type",
            "duration_seconds",
            "total_questions",
            "config",
            "is_published",
        ]
        extra_kwargs = {
            "config": {"required": False},
            "is_published": {"required": False, "default": False},
        }


class MockTestUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockTest
        fields = [
            "name",
            "duration_seconds",
            "total_questions",
            "config",
            "is_published",
        ]
        extra_kwargs = {field: {"required": False} for field in fields}


# ── MockTestQuestion ──────────────────────────────────────────────────────


class MockTestQuestionReadSerializer(serializers.ModelSerializer):
    mock_test_id = serializers.UUIDField(read_only=True)
    question_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = MockTestQuestion
        fields = [
            "id",
            "mock_test_id",
            "question_id",
            "position",
            "section",
            "marks",
        ]
        read_only_fields = fields


class MockTestQuestionCreateSerializer(serializers.ModelSerializer):
    mock_test_id = serializers.UUIDField(
        required=False,
        help_text="ID of the mock test. Optional when mock test is in the URL."
    )
    question_id = serializers.UUIDField(
        help_text="ID of the question to add"
    )

    class Meta:
        model = MockTestQuestion
        fields = [
            "mock_test_id",
            "question_id",
            "position",
            "section",
            "marks",
        ]
        extra_kwargs = {
            "section": {"required": False, "allow_null": True},
            "marks": {"required": False, "default": 1},
        }


# ── ExamAttempt ───────────────────────────────────────────────────────────


class ExamAttemptReadSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)
    exam_id = serializers.UUIDField(read_only=True)
    mock_test_id = serializers.UUIDField(read_only=True, allow_null=True)
    institution_id = serializers.UUIDField(read_only=True, allow_null=True)
    batch_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta:
        model = ExamAttempt
        fields = [
            "id",
            "user_id",
            "exam_id",
            "mock_test_id",
            "attempt_type",
            "status",
            "started_at",
            "duration_seconds",
            "submitted_at",
            "total_questions",
            "score",
            "max_score",
            "correct",
            "incorrect",
            "skipped",
            "accuracy",
            "time_taken_seconds",
            "institution_id",
            "batch_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ExamAttemptCreateSerializer(serializers.ModelSerializer):
    exam_id = serializers.UUIDField(
        help_text="ID of the exam to attempt"
    )
    attempt_type = serializers.ChoiceField(
        choices=_ATTEMPT_TYPE_CHOICES,
        help_text="Type: topic, subject, mixed, previous_year, full_mock, or daily",
    )
    mock_test_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID of the mock test (if applicable)",
    )
    duration_seconds = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Duration override in seconds",
    )

    class Meta:
        model = ExamAttempt
        fields = [
            "exam_id",
            "attempt_type",
            "mock_test_id",
            "duration_seconds",
        ]


class PracticeAttemptCreateSerializer(serializers.Serializer):
    """Request for a Topic/Subject/Mixed practice attempt (T28)."""

    exam_id = serializers.UUIDField(help_text="ID of the exam to practice")
    scope_type = serializers.ChoiceField(
        choices=["topic", "subject", "mixed"],
        help_text="Practice scope: topic, subject, or mixed",
    )
    scope_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Topic/Subject UUID for topic/subject scope; null for mixed",
    )


# ── UserAnswer ────────────────────────────────────────────────────────────


class UserAnswerReadSerializer(serializers.ModelSerializer):
    attempt_id = serializers.UUIDField(read_only=True)
    question_id = serializers.UUIDField(read_only=True)
    selected_option_id = serializers.UUIDField(
        read_only=True, allow_null=True
    )

    class Meta:
        model = UserAnswer
        fields = [
            "id",
            "attempt_id",
            "question_id",
            "selected_option_id",
            "state",
            "is_correct",
            "time_spent_seconds",
            "answered_at",
            "created_at",
        ]
        read_only_fields = fields


# PH-7.1 security note (internal): UserAnswerPlayerSerializer is the student-safe
# answer representation for an IN-PROGRESS attempt. It is identical to
# UserAnswerReadSerializer except it omits `is_correct`, so the mock player cannot
# infer the right answer mid-attempt. Correctness is only revealed after scoring,
# via ScoredAttemptDetailSerializer / the results endpoints. DO NOT add
# `is_correct` (or any other correctness signal) to this serializer.
class UserAnswerPlayerSerializer(serializers.ModelSerializer):
    """Answer as shown during an in-progress attempt (excludes correctness)."""

    attempt_id = serializers.UUIDField(read_only=True)
    question_id = serializers.UUIDField(read_only=True)
    selected_option_id = serializers.UUIDField(
        read_only=True, allow_null=True
    )

    class Meta:
        model = UserAnswer
        fields = [
            "id",
            "attempt_id",
            "question_id",
            "selected_option_id",
            "state",
            "time_spent_seconds",
            "answered_at",
            "created_at",
        ]
        read_only_fields = fields


class UserAnswerSaveSerializer(serializers.Serializer):
    question_id = serializers.UUIDField(
        help_text="ID of the question being answered"
    )
    selected_option_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID of the selected option (null to clear)",
    )
    state = serializers.ChoiceField(
        choices=_ANSWER_STATE_CHOICES,
        default="answered",
        help_text="Current state of the answer",
    )
    time_spent_seconds = serializers.IntegerField(
        required=False, default=0
    )


class UserAnswerBulkSaveSerializer(serializers.Serializer):
    answers = UserAnswerSaveSerializer(many=True)


# ── Scored Attempt Detail (includes answers) ──────────────────────────────


class ScoredAttemptDetailSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)
    exam_id = serializers.UUIDField(read_only=True)
    mock_test_id = serializers.UUIDField(read_only=True, allow_null=True)
    answers = serializers.SerializerMethodField()

    @extend_schema_field(UserAnswerReadSerializer(many=True))
    def get_answers(self, obj: ExamAttempt) -> list:
        # P0-1: correctness (is_correct) is only revealed once the attempt is
        # scored. While in_progress/submitted this serializer also backs
        # GET /attempts/{id}/, so use the player serializer there to avoid
        # leaking answer keys mid-exam. Scored attempts keep full correctness.
        answers = obj.answers.all()
        if obj.status == "scored":
            return UserAnswerReadSerializer(answers, many=True).data
        return UserAnswerPlayerSerializer(answers, many=True).data

    class Meta:
        model = ExamAttempt
        fields = [
            "id",
            "user_id",
            "exam_id",
            "mock_test_id",
            "attempt_type",
            "status",
            "started_at",
            "duration_seconds",
            "submitted_at",
            "total_questions",
            "score",
            "max_score",
            "correct",
            "incorrect",
            "skipped",
            "accuracy",
            "time_taken_seconds",
            "answers",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
