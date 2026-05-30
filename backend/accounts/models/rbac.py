import uuid

from django.conf import settings
from django.db import models


# ── Role seed constants (seeded by data migration or fixture) ────────────────
STUDENT = "student"
TEACHER = "teacher"
INSTITUTION_ADMIN = "institution_admin"
CONTENT_MANAGER = "content_manager"
CONTENT_REVIEWER = "content_reviewer"
SME = "sme"
PLATFORM_ADMIN = "platform_admin"

ROLE_SEED_VALUES = [
    STUDENT,
    TEACHER,
    INSTITUTION_ADMIN,
    CONTENT_MANAGER,
    CONTENT_REVIEWER,
    SME,
    PLATFORM_ADMIN,
]


class Role(models.Model):
    """RBAC role — maps 1:1 to PRD roles in §5 (Auth) and §12 (Content Ops)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Permission(models.Model):
    """Fine-grained action permission (e.g. ``question.approve``)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return self.code


class RolePermission(models.Model):
    """Many-to-many through table linking roles to permissions."""

    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = "accounts_role_permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="uq_role_permission",
            )
        ]

    def __str__(self) -> str:
        return f"{self.role} → {self.permission}"


class UserRole(models.Model):
    """
    Role assignment to a user, optionally scoped to an institution.
    ``institution_id = NULL`` means the role is global (e.g. platform_admin).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_roles"
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    institution_id = models.UUIDField(null=True, blank=True)
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_user_roles"
        constraints = [
            # Scoped role: one user+role pair per institution (non-null institution_id).
            models.UniqueConstraint(
                fields=["user", "role", "institution_id"],
                name="uq_user_role_institution_scoped",
                condition=models.Q(institution_id__isnull=False),
            ),
            # Global role: one user+role pair at most when institution_id IS NULL.
            # Standard SQL UNIQUE doesn't deduplicate NULLs, so a partial index is
            # required (PostgreSQL) or a separate constraint (SQLite in tests).
            models.UniqueConstraint(
                fields=["user", "role"],
                name="uq_user_role_global",
                condition=models.Q(institution_id__isnull=True),
            ),
        ]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["institution_id"]),
        ]

    def __str__(self) -> str:
        scope = f" (inst={self.institution_id})" if self.institution_id else " (global)"
        return f"{self.user} → {self.role}{scope}"
