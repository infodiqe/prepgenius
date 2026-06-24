import uuid

from django.conf import settings
from django.db import models

from credits.exceptions import LedgerAppendOnlyError


class CreditLedger(models.Model):
    """
    Append-only credit transaction record (PRD §13 — the ledger is immutable:
    no UPDATE, no DELETE). Every balance-changing operation writes exactly one
    row through the credits services. ``balance_after`` snapshots the user's
    available balance after the operation; ``amount`` is the signed magnitude of
    the operation (see services for the per-type sign convention).
    """

    GRANT = "grant"
    DEBIT = "debit"
    RESERVATION = "reservation"
    RELEASE = "release"
    ADJUSTMENT = "adjustment"
    TRANSACTION_TYPES = [
        (GRANT, "Grant"),
        (DEBIT, "Debit"),
        (RESERVATION, "Reservation"),
        (RELEASE, "Release"),
        (ADJUSTMENT, "Adjustment"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_ledger_entries",
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, default="")
    reference_id = models.UUIDField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "credit_ledger"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "-created_at"], name="ix_credit_ledger_user_time"
            ),
            models.Index(
                fields=["transaction_type"], name="ix_credit_ledger_type"
            ),
        ]

    def save(self, *args, **kwargs):  # type: ignore[override]
        """Append-only: allow the initial INSERT, forbid any later UPDATE."""
        if not self._state.adding:
            raise LedgerAppendOnlyError(
                "CreditLedger is append-only; entries cannot be updated."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # type: ignore[override]
        raise LedgerAppendOnlyError(
            "CreditLedger is append-only; entries cannot be deleted."
        )

    def __str__(self) -> str:
        return (
            f"CreditLedger({self.transaction_type}, amount={self.amount}, "
            f"user={self.user_id})"
        )
