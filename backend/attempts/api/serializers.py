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
        help_text="ID of the mock test"
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
    answers = UserAnswerReadSerializer(many=True, read_only=True)

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
