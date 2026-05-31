import uuid
from django.conf import settings
from django.db import models


class UserTopicPerformance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="topic_performances",
    )
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.CASCADE,
        related_name="topic_performances",
    )
    topic = models.ForeignKey(
        "exams.Topic",
        on_delete=models.CASCADE,
        related_name="user_performances",
    )
    attempts = models.IntegerField(default=0)
    correct = models.IntegerField(default=0)
    success_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    avg_time = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )
    last_practiced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Topic Performance"
        verbose_name_plural = "User Topic Performances"
        db_table = "user_topic_performance"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "topic"],
                name="uq_utp_user_topic",
            )
        ]
        indexes = [
            models.Index(fields=["user", "success_rate"], name="ix_utp_user_rate"),
        ]

    def __str__(self) -> str:
        return f"UTP_{str(self.id)[:8]} (User: {self.user_id}, Topic: {self.topic_id})"
