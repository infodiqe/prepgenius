from rest_framework import serializers

from cms.models import CMSBlock, CMSPage


class CMSBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = CMSBlock
        fields = ["block_type", "sort_order", "content"]
        read_only_fields = fields


class CMSPageSerializer(serializers.ModelSerializer):
    """Full page payload for the public detail endpoint, with ordered blocks."""

    blocks = CMSBlockSerializer(many=True, read_only=True)

    class Meta:
        model = CMSPage
        fields = [
            "slug",
            "title",
            "meta_title",
            "meta_description",
            "locale",
            "status",
            "published_at",
            "blocks",
        ]
        read_only_fields = fields


class CMSPageListSerializer(serializers.ModelSerializer):
    """Minimal payload used to build the sitemap (no block content)."""

    class Meta:
        model = CMSPage
        fields = ["slug", "locale", "updated_at"]
        read_only_fields = fields


class CMSGuideCardSerializer(serializers.ModelSerializer):
    """Card payload for the guide index and related-guides lists (T45)."""

    class Meta:
        model = CMSPage
        fields = ["slug", "title", "meta_description", "category"]
        read_only_fields = fields


class CMSGuideDetailSerializer(serializers.ModelSerializer):
    """Full guide payload: ordered blocks plus simple related guides (T45).

    `related` is supplied via serializer context (computed in the view selector)
    so the serializer stays free of query logic.
    """

    blocks = CMSBlockSerializer(many=True, read_only=True)
    related = serializers.SerializerMethodField()

    class Meta:
        model = CMSPage
        fields = [
            "slug",
            "title",
            "meta_title",
            "meta_description",
            "category",
            "locale",
            "published_at",
            "blocks",
            "related",
        ]
        read_only_fields = fields

    def get_related(self, obj) -> list:
        related = self.context.get("related", [])
        return CMSGuideCardSerializer(related, many=True).data
