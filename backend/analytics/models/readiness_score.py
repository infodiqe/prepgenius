import uuid
from django.conf import settings
from django.db import models


class ExamReadinessScore(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="readiness_scores",
    )
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.CASCADE,
        related_name="readiness_scores",
    )
    score = models.DecimalField(max_digits=5, decimal_places=2)
    components = models.JSONField(default=dict)
    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Exam Readiness Score"
        verbose_name_plural = "Exam Readiness Scores"
        db_table = "exam_readiness_scores"
        indexes = [
            models.Index(
                fields=["user", "exam", "-computed_at"],
                name="ix_readiness_user",
            ),
        ]

    def __str__(self) -> str:
        return f"Readiness_{str(self.id)[:8]} (User: {self.user_id}, Score: {self.score}%)"
