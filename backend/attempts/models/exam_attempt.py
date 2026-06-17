import uuid

from django.conf import settings
from django.db import models


class ExamAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    exam = models.ForeignKey(
        "exams.Exam", on_delete=models.CASCADE, related_name="attempts"
    )
    mock_test = models.ForeignKey(
        "attempts.MockTest",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attempts",
    )
    attempt_type = models.CharField(
        max_length=20,
        choices=[
            ("topic", "Topic"),
            ("subject", "Subject"),
            ("mixed", "Mixed"),
            ("previous_year", "Previous Year"),
            ("full_mock", "Full Mock"),
            ("daily", "Daily"),
        ],
    )
    status = models.CharField(
        max_length=12,
        choices=[
            ("created", "Created"),
            ("in_progress", "In Progress"),
            ("submitted", "Submitted"),
            ("scored", "Scored"),
        ],
        default="created",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    total_questions = models.IntegerField(default=0)
    score = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )
    max_score = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )
    correct = models.IntegerField(default=0)
    incorrect = models.IntegerField(default=0)
    skipped = models.IntegerField(default=0)
    accuracy = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    time_taken_seconds = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "-created_at"],
                name="ix_ea_user_time",
            ),
            models.Index(
                fields=["user", "exam"], name="ix_ea_user_exam"
            ),
            models.Index(
                fields=["mock_test"], name="ix_ea_mock_test"
            ),
            # PH-1.3: bounds the auto-submit expiry sweep (filters
            # status="in_progress" then compares started_at). Partial index keeps
            # it tiny — only in-progress rows, which is the hot set.
            models.Index(
                fields=["status", "started_at"],
                name="ix_ea_expiry_scan",
                condition=models.Q(status="in_progress"),
            ),
        ]

    def __str__(self) -> str:
        return (
            f"Attempt_{str(self.id)[:8]} "
            f"({self.user.email} / {self.exam.code} / {self.status})"
        )
