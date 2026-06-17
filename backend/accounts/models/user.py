import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """
    Email-based manager. USERNAME_FIELD is ``email``, so ``create_user`` /
    ``create_superuser`` take email (not username) — this is what
    ``createsuperuser`` calls. The inherited ``username`` column (unique +
    NOT NULL from AbstractUser) is mirrored from the email to satisfy the
    constraint without exposing username as an auth identifier.
    """

    def _create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email).lower()
        extra_fields.setdefault("username", email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        # A superuser is an operator account — active and verified by definition.
        extra_fields.setdefault("status", "active")
        extra_fields.setdefault("is_email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


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

    # ── Brute-force lockout (PH-4) ─────────────────────────────────────────────
    # Consecutive failed-login counter and a lock expiry. Reset on success;
    # counter zeroed when the lock is applied. Enforced in accounts.services.auth.
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    # ── DPDP deletion tombstone ───────────────────────────────────────────────
    deleted_at = models.DateTimeField(null=True, blank=True)  # PRD §22

    # ── Timestamps (overridden from AbstractUser) ─────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Email is the login identifier ─────────────────────────────────────────
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

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
