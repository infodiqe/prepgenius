"""
Operations analytics serializers — OPS-BE-03 (output shaping only).

Read-only response serializers for the operator analytics APIs. They shape and
type the service payloads; they hold no logic. Money fields are NUMERIC
(DecimalField), never float.
"""
from rest_framework import serializers


class OpsOverviewSerializer(serializers.Serializer):
    """API 1 — GET /ops/analytics/overview/."""

    total_users = serializers.IntegerField()
    active_users_30d = serializers.IntegerField()
    total_attempts = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    approved_questions = serializers.IntegerField()
    published_pages = serializers.IntegerField()
    available_credits = serializers.DecimalField(max_digits=14, decimal_places=2)
    reserved_credits = serializers.DecimalField(max_digits=14, decimal_places=2)


class ReadinessBandSerializer(serializers.Serializer):
    label = serializers.CharField()
    count = serializers.IntegerField()


class OpsReadinessDistributionSerializer(serializers.Serializer):
    """API 2 — GET /ops/analytics/readiness/."""

    bands = ReadinessBandSerializer(many=True)
    total = serializers.IntegerField()


class OpsContentDistributionSerializer(serializers.Serializer):
    """API 3 — GET /ops/analytics/content/."""

    draft = serializers.IntegerField()
    in_review = serializers.IntegerField()
    sme_review = serializers.IntegerField()
    approved = serializers.IntegerField()
    published = serializers.IntegerField()


class OpsReviewAnalyticsSerializer(serializers.Serializer):
    """API 4 — GET /ops/analytics/review/."""

    claimed = serializers.IntegerField()
    unclaimed = serializers.IntegerField()
    escalated = serializers.IntegerField()
    approved_today = serializers.IntegerField()
    rejected_today = serializers.IntegerField()


class OpsCreditAnalyticsSerializer(serializers.Serializer):
    """API 5 — GET /ops/analytics/credits/."""

    total_granted = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_reserved = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_debited = serializers.DecimalField(max_digits=14, decimal_places=2)
    active_wallets = serializers.IntegerField()
