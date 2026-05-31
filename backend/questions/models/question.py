import uuid

from django.conf import settings
from django.db import models
from pgvector.django import VectorField


class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(
        "exams.Exam", on_delete=models.CASCADE, related_name="questions"
    )
    subtopic = models.ForeignKey(
        "exams.Subtopic", on_delete=models.PROTECT, related_name="questions"
    )
    stem = models.TextField()
    explanation = models.TextField(null=True, blank=True)
    difficulty = models.SmallIntegerField(default=2)
    language = models.CharField(max_length=10, default="as")
    origin = models.CharField(
        max_length=10,
        choices=[
            ("official", "Official"),
            ("ai", "AI Generated"),
            ("manual", "Manual"),
        ],
        default="manual",
    )
    review_status = models.CharField(
        max_length=12,
        choices=[
            ("draft", "Draft"),
            ("in_review", "In Review"),
            ("sme_review", "SME Review"),
            ("approved", "Approved"),
            ("published", "Published"),
            ("rejected", "Rejected"),
        ],
        default="draft",
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_questions",
    )
    claimed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="claimed_questions",
    )
    tags = models.JSONField(default=dict)
    embedding = VectorField(dimensions=1024, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["exam", "subtopic", "difficulty"], name="ix_q_select"
            ),
            models.Index(fields=["review_status"], name="ix_q_status"),
            models.Index(
                fields=["exam"],
                name="ix_q_published",
                condition=models.Q(review_status="published"),
            ),
            models.Index(
                fields=["claimed_by"],
                name="ix_q_claimed_by",
            ),
        ]
        # NOTE: Add HNSW index on `embedding` in production via RunSQL:
        # CREATE INDEX CONCURRENTLY ix_q_embedding
        #   ON questions_question USING hnsw (embedding vector_cosine_ops)
        #   WITH (m=16, ef_construction=64);

    def __str__(self) -> str:
        return f"Q_{str(self.id)[:8]} ({self.exam.code} / {self.review_status})"
