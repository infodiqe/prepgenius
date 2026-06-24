import uuid

from django.db import models
from django.utils import timezone

# Locale set mirrors the frontend next-intl locales (PRD v4 §4.1).
LOCALE_CHOICES = [
    ("as", "Assamese"),
    ("en", "English"),
    ("hi", "Hindi"),
]

STATUS_DRAFT = "draft"
STATUS_PUBLISHED = "published"
STATUS_CHOICES = [
    (STATUS_DRAFT, "Draft"),
    (STATUS_PUBLISHED, "Published"),
]

# Page kind. A generic `page` renders at /content/<slug>; a `guide` is a
# CMS-powered study guide rendered at /guides/<slug> (T45). Same model, same
# blocks — only the surface differs.
PAGE_TYPE_PAGE = "page"
PAGE_TYPE_GUIDE = "guide"
PAGE_TYPE_CHOICES = [
    (PAGE_TYPE_PAGE, "Page"),
    (PAGE_TYPE_GUIDE, "Guide"),
]


class CMSPage(models.Model):
    """A public content page authored in Django Admin (T41).

    Identified by (slug, locale): the same slug can have one page per locale.
    Only `published` pages are exposed by the public API.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=200)
    title = models.CharField(max_length=255)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    locale = models.CharField(
        max_length=10, choices=LOCALE_CHOICES, default="as"
    )
    page_type = models.CharField(
        max_length=20, choices=PAGE_TYPE_CHOICES, default=PAGE_TYPE_PAGE
    )
    # Optional grouping label for guide index pages (e.g. "CTET"). Freeform so
    # new categories are data, not deployments (claude_rules §1).
    category = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "CMS Page"
        verbose_name_plural = "CMS Pages"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["slug", "locale"], name="uniq_cmspage_slug_locale"
            )
        ]
        indexes = [
            models.Index(fields=["slug", "locale"]),
            models.Index(fields=["status"]),
            models.Index(fields=["page_type", "status"]),
        ]

    def save(self, *args, **kwargs):
        # Stamp the first publish so downstream consumers have a publish time.
        if self.status == STATUS_PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.slug} ({self.locale}) — {self.get_status_display()}"
