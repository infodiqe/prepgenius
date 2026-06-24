"""
Credits domain selectors — OPS-BE-02 (reads only).

Pure readers. No mutations, no business logic. The ledger queryset is ordered
newest-first so the view's ``CursorPagination`` can page it.
"""
from decimal import Decimal

from django.db.models import QuerySet

from credits.models import CreditBalance, CreditLedger

ZERO = Decimal("0.00")


def get_credit_balance(*, user) -> CreditBalance | None:
    """The user's balance row, or ``None`` if they have never had credits."""
    return CreditBalance.objects.filter(user=user).first()


def get_credit_ledger(*, user) -> QuerySet[CreditLedger]:
    """The user's ledger entries, newest first (for cursor pagination)."""
    return CreditLedger.objects.filter(user=user).order_by("-created_at")


def get_credit_summary(*, user) -> dict:
    """
    ``{available, reserved, lifetime}`` for the user. A user with no balance row
    reads as all-zero (never fabricated — zero is the true starting position).
    """
    balance = get_credit_balance(user=user)
    if balance is None:
        return {"available": ZERO, "reserved": ZERO, "lifetime": ZERO}
    return {
        "available": balance.available_credits,
        "reserved": balance.reserved_credits,
        "lifetime": balance.lifetime_credits,
    }
