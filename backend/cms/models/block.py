import uuid

from django.db import models

# Supported block types (T41 — nothing else).
BLOCK_HERO = "hero"
BLOCK_RICH_TEXT = "rich_text"
BLOCK_FAQ = "faq"
BLOCK_CTA = "cta"
BLOCK_TYPE_CHOICES = [
    (BLOCK_HERO, "Hero"),
    (BLOCK_RICH_TEXT, "Rich Text"),
    (BLOCK_FAQ, "FAQ"),
    (BLOCK_CTA, "CTA"),
]


class CMSBlock(models.Model):
    """An ordered content block belonging to a CMSPage (T41).

    The shape of `content` depends on `block_type`; it is freeform JSON authored
    in Django Admin and rendered by the matching frontend block renderer.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    page = models.ForeignKey(
        "cms.CMSPage", on_delete=models.CASCADE, related_name="blocks"
    )
    block_type = models.CharField(max_length=20, choices=BLOCK_TYPE_CHOICES)
    sort_order = models.PositiveIntegerField(default=0)
    content = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "CMS Block"
        verbose_name_plural = "CMS Blocks"
        ordering = ["sort_order", "id"]
        indexes = [models.Index(fields=["page", "sort_order"])]

    def __str__(self) -> str:
        return f"{self.page.slug} · {self.block_type} #{self.sort_order}"
