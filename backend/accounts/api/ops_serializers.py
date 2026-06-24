"""
Operations User 360 serializers — OPS-BE-01 (read-only).

Shape the existing user / attempt / readiness data for the operational APIs. No
writable fields, no computed metrics. The detail endpoint reuses the existing
``UserProfileSerializer`` (see ops_views); these serializers cover the list and
summary shapes only.
"""
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from accounts.models import User


class OpsExamRefSerializer(serializers.Serializer):
    """Minimal exam reference (id + code + name) for nesting."""

    id = serializers.UUIDField(read_only=True)
    code = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)


class OpsUserListSerializer(serializers.ModelSerializer):
    """One row of the operational users list (API 1)."""

    roles = serializers.SerializerMethodField()
    target_exam = OpsExamRefSerializer(read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "roles",
            "status",
            "target_exam",
            "created_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_roles(self, obj: User) -> list[str]:
        """All RBAC role names the user holds (read from the prefetch)."""
        return [ur.role.name for ur in obj.user_roles.all()]


class OpsUserQuerySerializer(serializers.Serializer):
    """Validates the list endpoint's query params (search + filters)."""

    search = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=[choice[0] for choice in User.STATUS],
        required=False,
        allow_blank=True,
    )
    target_exam = serializers.UUIDField(required=False)


class OpsLatestAttemptSerializer(serializers.Serializer):
    """Compact view of a user's most recent attempt (existing fields only)."""

    id = serializers.UUIDField(read_only=True)
    exam = OpsExamRefSerializer(read_only=True)
    attempt_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    total_questions = serializers.IntegerField(read_only=True)
    score = serializers.DecimalField(
        max_digits=7, decimal_places=2, read_only=True, allow_null=True
    )
    accuracy = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True, allow_null=True
    )
    created_at = serializers.DateTimeField(read_only=True)
    submitted_at = serializers.DateTimeField(read_only=True, allow_null=True)


class OpsUserSummarySerializer(serializers.Serializer):
    """Operational summary (API 3) — counts + latest attempt + analytics reads."""

    total_attempts = serializers.IntegerField(read_only=True)
    latest_attempt = OpsLatestAttemptSerializer(read_only=True, allow_null=True)
    readiness_score = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True, allow_null=True
    )
    current_streak = serializers.IntegerField(read_only=True)
