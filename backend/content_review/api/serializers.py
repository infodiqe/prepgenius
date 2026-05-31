from rest_framework import serializers

from content_review.models import ContentApproval, ContentReview


class ContentReviewReadSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(
        source="actor.full_name", read_only=True, default=None
    )

    class Meta:
        model = ContentReview
        fields = [
            "id",
            "question_id",
            "actor",
            "actor_name",
            "actor_role",
            "action",
            "from_status",
            "to_status",
            "comment",
            "created_at",
        ]


class ContentApprovalReadSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(
        source="approver.full_name", read_only=True, default=None
    )

    class Meta:
        model = ContentApproval
        fields = [
            "id",
            "question_id",
            "approver",
            "approver_name",
            "approval_level",
            "note",
            "approved_at",
        ]


class ClaimQuestionSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()


class ReleaseClaimSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()


class ReviewActionSerializer(serializers.Serializer):
    comment = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
