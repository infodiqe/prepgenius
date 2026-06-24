import uuid

from django.conf import settings
from django.db import models


class CreditBalance(models.Model):
    """
    A user's credit position. One balance per user (PRD §13 — credits are
    NUMERIC, never float). Mutated only by the credits services under
    ``select_for_update`` inside an atomic transaction; never written directly.

    - ``available_credits`` — spendable now.
    - ``reserved_credits``  — locked by an in-flight reserve (reserve→commit/release).
    - ``lifetime_credits``  — cumulative credits ever added (grants + positive
      adjustments); monotonic, for reporting.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_balance",
    )
    available_credits = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    reserved_credits = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    lifetime_credits = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "credit_balances"
        indexes = [
            models.Index(fields=["updated_at"], name="ix_credit_bal_updated"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(available_credits__gte=0),
                name="ck_credit_available_non_negative",
            ),
            models.CheckConstraint(
                check=models.Q(reserved_credits__gte=0),
                name="ck_credit_reserved_non_negative",
            ),
            models.CheckConstraint(
                check=models.Q(lifetime_credits__gte=0),
                name="ck_credit_lifetime_non_negative",
            ),
        ]

    def __str__(self) -> str:
        return f"CreditBalance(user={self.user_id}, available={self.available_credits})"
