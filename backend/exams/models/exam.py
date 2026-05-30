import uuid

from django.db import models


def _default_difficulty_levels() -> list:
    """Default difficulty distribution per DB schema."""
    return ["easy", "medium", "hard"]


class Exam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=150)
    exam_type = models.CharField(
        max_length=20,
        choices=[
            ("qualifying", "Qualifying"),
            ("ranked", "Ranked"),
            ("entrance", "Entrance"),
        ],
    )
    difficulty_levels = models.JSONField(default=_default_difficulty_levels)
    exam_rules = models.JSONField(default=dict)
    blueprint = models.JSONField(default=dict)
    passing_criteria = models.JSONField(default=dict)
    analytics_rules = models.JSONField(default=dict)
    audience_is_minor = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Exam"
        verbose_name_plural = "Exams"
        indexes = [models.Index(fields=["is_active"])]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"
