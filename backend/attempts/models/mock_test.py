import uuid

from django.conf import settings
from django.db import models


class MockTest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(
        "exams.Exam", on_delete=models.CASCADE, related_name="mock_tests"
    )
    name = models.CharField(max_length=180)
    type = models.CharField(
        max_length=20,
        choices=[
            ("system", "System"),
            ("previous_year", "Previous Year"),
            ("custom", "Custom"),
        ],
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_mock_tests",
    )
    previous_year_paper = models.ForeignKey(
        "exams.PreviousYearPaper",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="mock_tests",
    )
    duration_seconds = models.IntegerField()
    total_questions = models.IntegerField()
    config = models.JSONField(default=dict)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["exam", "type"], name="ix_mt_exam_type"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.exam.code})"
