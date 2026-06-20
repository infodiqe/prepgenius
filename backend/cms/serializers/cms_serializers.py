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
