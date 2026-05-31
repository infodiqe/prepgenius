import uuid

from django.db import models


class MockTestQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mock_test = models.ForeignKey(
        "attempts.MockTest",
        on_delete=models.CASCADE,
        related_name="questions",
    )
    question = models.ForeignKey(
        "questions.Question",
        on_delete=models.RESTRICT,
        related_name="mock_test_questions",
    )
    position = models.IntegerField()
    section = models.CharField(max_length=60, null=True, blank=True)
    marks = models.DecimalField(max_digits=5, decimal_places=2, default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["mock_test", "question"],
                name="uq_mtq_mock_test_question",
            ),
        ]
        indexes = [
            models.Index(
                fields=["mock_test", "position"],
                name="ix_mtq_order",
            ),
        ]

    def __str__(self) -> str:
        return f"Q{self.position} in {self.mock_test.name}"
