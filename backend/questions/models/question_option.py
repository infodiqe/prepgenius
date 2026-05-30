import uuid

from django.db import models

from .question import Question


class QuestionOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="options"
    )
    label = models.CharField(max_length=5)
    body = models.TextField()
    is_correct = models.BooleanField(default=False)
    position = models.IntegerField(default=0)

    class Meta:
        ordering = ["question", "position"]
        constraints = [
            models.UniqueConstraint(
                fields=["question", "label"], name="uq_option_question_label"
            )
        ]

    def __str__(self) -> str:
        return f"{self.label}. {self.body[:50]}"
