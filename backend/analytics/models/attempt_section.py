import uuid
from django.db import models


class AttemptSectionAnalytics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(
        "attempts.ExamAttempt",
        on_delete=models.CASCADE,
        related_name="section_analytics",
    )
    scope_type = models.CharField(
        max_length=10,
        choices=[("subject", "subject"), ("topic", "topic")],
    )
    scope_id = models.UUIDField()
    total = models.IntegerField(default=0)
    correct = models.IntegerField(default=0)
    accuracy = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    avg_time = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Attempt Section Analytics"
        verbose_name_plural = "Attempt Section Analytics"
        db_table = "attempt_section_analytics"
        indexes = [
            models.Index(fields=["attempt"], name="ix_asa_attempt"),
            models.Index(fields=["scope_type", "scope_id"], name="ix_asa_scope"),
        ]

    def __str__(self) -> str:
        return f"Section_{str(self.id)[:8]} ({self.scope_type}: {self.scope_id})"
