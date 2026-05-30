import uuid

from django.db import models


class AiGeneratedQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(
        "exams.Exam", on_delete=models.CASCADE, related_name="ai_generations"
    )
    subtopic = models.ForeignKey(
        "exams.Subtopic", null=True, blank=True, on_delete=models.SET_NULL
    )
    generation_batch = models.UUIDField(null=True, blank=True)
    model_used = models.CharField(max_length=60)
    prompt = models.TextField(null=True, blank=True)
    constraints_snapshot = models.JSONField(default=dict)
    raw_output = models.TextField(null=True, blank=True)
    validation = models.JSONField(default=dict)
    credits_charged = models.DecimalField(
        max_digits=14, decimal_places=4, default=0
    )
    status = models.CharField(
        max_length=12,
        choices=[
            ("generated", "Generated"),
            ("validated", "Validated"),
            ("promoted", "Promoted"),
            ("discarded", "Discarded"),
        ],
        default="generated",
    )
    resulting_question = models.ForeignKey(
        "questions.Question",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_source",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "AI Generated Question"
        verbose_name_plural = "AI Generated Questions"
        indexes = [
            models.Index(fields=["exam", "status"]),
            models.Index(fields=["resulting_question"]),
        ]

    def __str__(self) -> str:
        return f"Gen_{str(self.id)[:8]} ({self.exam.code} / {self.status})"
