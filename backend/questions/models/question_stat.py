from django.db import models

from .question import Question


class QuestionStat(models.Model):
    question = models.OneToOneField(
        Question,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="stats",
    )
    attempts = models.BigIntegerField(default=0)
    correct = models.BigIntegerField(default=0)
    success_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    avg_time_seconds = models.DecimalField(
        max_digits=8, decimal_places=2, default=0
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Question Stat"
        verbose_name_plural = "Question Stats"
        indexes = [
            models.Index(fields=["success_rate"]),
        ]

    def __str__(self) -> str:
        return f"Stats Q_{str(self.question_id)[:8]}: {self.attempts} attempts"
