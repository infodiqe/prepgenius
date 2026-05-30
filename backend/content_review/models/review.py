import uuid

from django.conf import settings
from django.db import models


class ContentReview(models.Model):
    question = models.ForeignKey(
        "questions.Question",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    ai_generated_question = models.ForeignKey(
        "questions.AiGeneratedQuestion",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    actor_role = models.CharField(max_length=50, null=True, blank=True)
    action = models.CharField(
        max_length=20,
        choices=[
            ("submit", "Submit"),
            ("claim", "Claim"),
            ("edit", "Edit"),
            ("approve", "Approve"),
            ("reject", "Reject"),
            ("request_sme", "Request SME"),
            ("publish", "Publish"),
            ("audit_flag", "Audit Flag"),
        ],
    )
    from_status = models.CharField(max_length=20, null=True, blank=True)
    to_status = models.CharField(max_length=20, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Content Review"
        verbose_name_plural = "Content Reviews"
        indexes = [
            models.Index(fields=["question", "created_at"]),
            models.Index(fields=["actor"]),
        ]

    def __str__(self) -> str:
        qid = str(self.question_id or self.ai_generated_question_id or "")[:8]
        return f"Review_{qid}: {self.action} ({self.from_status} → {self.to_status})"


class ContentApproval(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        "questions.Question",
        on_delete=models.CASCADE,
        related_name="approvals",
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    approval_level = models.CharField(
        max_length=10,
        choices=[("reviewer", "Reviewer"), ("sme", "SME")],
    )
    note = models.TextField(null=True, blank=True)
    approved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Content Approval"
        verbose_name_plural = "Content Approvals"
        constraints = [
            models.UniqueConstraint(
                fields=["question", "approval_level"],
                name="uq_approval_question_level",
            )
        ]

    def __str__(self) -> str:
        return f"Approval_{str(self.question_id)[:8]} ({self.approval_level})"
