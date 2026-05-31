import uuid
from django.conf import settings
from django.db import models


class WeakTopic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weak_topics",
    )
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.CASCADE,
        related_name="weak_topics",
    )
    topic = models.ForeignKey(
        "exams.Topic",
        on_delete=models.CASCADE,
        related_name="weak_topics",
    )
    accuracy = models.DecimalField(max_digits=5, decimal_places=2)
    severity = models.SmallIntegerField(default=1)  # 1-3
    status = models.CharField(
        max_length=12,
        choices=[
            ("active", "Active"),
            ("improving", "Improving"),
            ("resolved", "Resolved"),
        ],
        default="active",
    )
    detected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Weak Topic"
        verbose_name_plural = "Weak Topics"
        db_table = "weak_topics"
        indexes = [
            models.Index(
                fields=["user"],
                name="ix_weak_active",
                condition=models.Q(status="active"),
            ),
            models.Index(fields=["topic"], name="ix_weak_topic"),
        ]

    def __str__(self) -> str:
        return f"WeakTopic_{str(self.id)[:8]} (User: {self.user_id}, Topic: {self.topic_id}, Status: {self.status})"
