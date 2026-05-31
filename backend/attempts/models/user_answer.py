from django.db import models


class UserAnswer(models.Model):
    id = models.BigAutoField(primary_key=True)
    attempt = models.ForeignKey(
        "attempts.ExamAttempt",
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.ForeignKey(
        "questions.Question",
        on_delete=models.RESTRICT,
        related_name="user_answers",
    )
    selected_option = models.ForeignKey(
        "questions.QuestionOption",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="user_answers",
    )
    state = models.CharField(
        max_length=20,
        choices=[
            ("not_visited", "Not Visited"),
            ("visited", "Visited"),
            ("answered", "Answered"),
            ("marked", "Marked"),
            ("answered_marked", "Answered & Marked"),
        ],
        default="not_visited",
    )
    is_correct = models.BooleanField(null=True, blank=True)
    time_spent_seconds = models.IntegerField(default=0)
    answered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"],
                name="uq_ua_attempt_question",
            ),
        ]
        indexes = [
            models.Index(
                fields=["question"], name="ix_ua_question"
            ),
        ]

    def __str__(self) -> str:
        return (
            f"Answer_{self.id} "
            f"(Attempt {str(self.attempt_id)[:8]} / Q {str(self.question_id)[:8]})"
        )
