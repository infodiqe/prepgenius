import uuid

from django.db import models

from .question import Question


class QuestionAppearance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="appearances"
    )
    paper = models.ForeignKey(
        "exams.PreviousYearPaper",
        on_delete=models.CASCADE,
        related_name="question_appearances",
    )
    year = models.IntegerField()

    class Meta:
        verbose_name = "Question Appearance"
        verbose_name_plural = "Question Appearances"
        constraints = [
            models.UniqueConstraint(
                fields=["question", "paper"], name="uq_appearance_question_paper"
            )
        ]
        indexes = [
            models.Index(fields=["paper"]),
        ]

    def __str__(self) -> str:
        return f"Q_{str(self.question_id)[:8]} → {self.paper} ({self.year})"
