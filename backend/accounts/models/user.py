import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model — UUID PK, email-based auth, full name, exam targeting,
    DPDP-compliant status lifecycle.
    PRD §10 Module 1 (Auth & Profile), §22 (DPDP compliance).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ── Email (normalized to lowercase in save() for case-insensitive lookup) ──
    email = models.EmailField(unique=True)

    # ── Phone (nullable; validated at service layer) ──────────────────────────
    phone_e164 = models.CharField(max_length=20, null=True, blank=True)

    # ── Profile ───────────────────────────────────────────────────────────────
    full_name = models.CharField(max_length=150)
    preferred_language = models.CharField(max_length=10, default="as")  # PRD §4.1

    # ── Exam targeting (config-driven; FK to exams app) ───────────────────────
    target_exam = models.ForeignKey(
        "exams.Exam",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="aspirants",
    )  # PRD §10 Module 1, §19 exam config
    exam_date = models.DateField(null=True, blank=True)

    # ── Minor flag (gates DPDP children's-data rules) ─────────────────────────
    is_minor = models.BooleanField(default=False)  # PRD §19, §22

    # ── Status lifecycle (DPDP: "deleted" anonymizes, does not hard-delete) ───
    STATUS = [
        ("pending", "pending"),
        ("active", "active"),
        ("suspended", "suspended"),
        ("deleted", "deleted"),
    ]
    status = models.CharField(
        max_length=20, choices=STATUS, default="pending"
    )  # PRD §22

    # ── Verification flags ────────────────────────────────────────────────────
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    # ── Auth ──────────────────────────────────────────────────────────────────
    # username — inherited from AbstractUser but unused; USERNAME_FIELD = "email"
    # password — inherited (Argon2-hashed via PASSWORD_HASHERS)
    # last_login — inherited (the canonical "last_login_at"; no duplicate field)

    # ── DPDP deletion tombstone ───────────────────────────────────────────────
    deleted_at = models.DateTimeField(null=True, blank=True)  # PRD §22

    # ── Timestamps (overridden from AbstractUser) ─────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Email is the login identifier ─────────────────────────────────────────
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta(AbstractUser.Meta):
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["target_exam"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["phone_e164"],
                name="ux_users_phone",
                condition=models.Q(phone_e164__isnull=False),
            )
        ]

    def save(self, *args, **kwargs):  # type: ignore[override]
        """Normalize email to lowercase for case-insensitive uniqueness."""
        if self.email:
            self.email = self.email.lower().strip()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.email
