from rest_framework import serializers


class AttemptResultsSerializer(serializers.Serializer):
    attempt_id = serializers.UUIDField()
    score = serializers.DecimalField(max_digits=7, decimal_places=2, allow_null=True)
    max_score = serializers.DecimalField(max_digits=7, decimal_places=2, allow_null=True)
    correct = serializers.IntegerField()
    incorrect = serializers.IntegerField()
    skipped = serializers.IntegerField()
    accuracy = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    time_taken_seconds = serializers.IntegerField(allow_null=True)
    status = serializers.CharField()
    submitted_at = serializers.DateTimeField(allow_null=True)
    pass_status = serializers.CharField()


class AttemptSectionAnalyticItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    scope_id = serializers.UUIDField()
    name = serializers.CharField()
    total = serializers.IntegerField()
    correct = serializers.IntegerField()
    accuracy = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    avg_time = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)


class AttemptAnalyticsSerializer(serializers.Serializer):
    attempt_id = serializers.UUIDField()
    subjects = AttemptSectionAnalyticItemSerializer(many=True)
    topics = AttemptSectionAnalyticItemSerializer(many=True)


class RecentActivitySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    attempt_type = serializers.CharField()
    score = serializers.DecimalField(max_digits=7, decimal_places=2, allow_null=True)
    max_score = serializers.DecimalField(max_digits=7, decimal_places=2, allow_null=True)
    correct = serializers.IntegerField()
    incorrect = serializers.IntegerField()
    accuracy = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    created_at = serializers.DateTimeField()


class WeakTopicSerializer(serializers.Serializer):
    topic_id = serializers.UUIDField()
    topic_name = serializers.CharField()
    accuracy = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    severity = serializers.IntegerField()
    status = serializers.CharField()


class RecommendationSerializer(serializers.Serializer):
    topic_id = serializers.UUIDField()
    topic_name = serializers.CharField()
    subject_name = serializers.CharField()
    accuracy = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    severity = serializers.IntegerField()
    recommended_action = serializers.CharField()


class AttemptTrendSerializer(serializers.Serializer):
    """Chronological scored-attempt history item (T24)."""

    attempt_id = serializers.UUIDField()
    created_at = serializers.DateTimeField()
    score = serializers.DecimalField(
        max_digits=7, decimal_places=2, allow_null=True
    )
    max_score = serializers.DecimalField(
        max_digits=7, decimal_places=2, allow_null=True
    )
    accuracy = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )


class SectionTrendHistoryItemSerializer(serializers.Serializer):
    attempt_id = serializers.UUIDField()
    created_at = serializers.DateTimeField()
    accuracy = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )


class SectionTrendSerializer(serializers.Serializer):
    """Per-section accuracy history grouped by scope (T24)."""

    scope_id = serializers.UUIDField()
    scope_name = serializers.CharField()
    history = SectionTrendHistoryItemSerializer(many=True)


class ReadinessTrendSerializer(serializers.Serializer):
    """Readiness timeline item (T24)."""

    score = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    band = serializers.CharField(allow_null=True)
    computed_at = serializers.DateTimeField()
    components = serializers.JSONField()


class ReadinessSerializer(serializers.Serializer):
    """Exam readiness response (T22). `status` is 'scored' or 'provisional';
    provisional rows carry null score/band/computed_at and an empty components."""

    status = serializers.CharField()
    score = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    band = serializers.CharField(allow_null=True)
    components = serializers.JSONField()
    computed_at = serializers.DateTimeField(allow_null=True)


class UserTopicPerformanceSerializer(serializers.Serializer):
    """Read-only topic-mastery row (T23). Mirrors the shape returned by the
    `get_user_topic_performance` selector; all values are backend-computed."""

    topic_id = serializers.UUIDField()
    topic_name = serializers.CharField()
    attempts = serializers.IntegerField()
    correct = serializers.IntegerField()
    success_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    avg_time = serializers.DecimalField(
        max_digits=8, decimal_places=2, allow_null=True
    )
    last_practiced_at = serializers.DateTimeField(allow_null=True)


class DashboardSerializer(serializers.Serializer):
    streak = serializers.IntegerField()
    daily_questions_attempted = serializers.IntegerField()
    daily_target = serializers.IntegerField()
    overall_accuracy = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    recent_activity = RecentActivitySerializer(many=True)
    weak_topics = WeakTopicSerializer(many=True)
    recommendations = RecommendationSerializer(many=True)

