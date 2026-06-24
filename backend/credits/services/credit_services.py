"""
Credits domain services — OPS-BE-02.

The ONLY place credit balances are mutated. Every operation:
  - runs inside ``transaction.atomic()``,
  - locks the user's balance row with ``select_for_update`` (no double-spend),
  - prevents negative balances,
  - raises a domain exception on any invariant violation, and
  - appends exactly one immutable ``CreditLedger`` row.

Sign convention (``amount`` on the ledger; ``balance_after`` = available after):
  grant       amount = +X   available += X, lifetime += X
  adjustment  amount = ±X   available += X (lifetime += X only if X > 0)
  reservation amount = -X   available -= X, reserved += X
  debit       amount = -X   reserved  -= X  (commit; available unchanged)
  release     amount = +X   reserved  -= X, available += X
"""
from decimal import Decimal
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db import transaction

from credits.exceptions import (
    InsufficientCredits,
    InsufficientReservedCredits,
    InvalidCreditAmount,
)
from credits.models import CreditBalance, CreditLedger

User = get_user_model()

ZERO = Decimal("0")


def _to_decimal(amount) -> Decimal:
    return amount if isinstance(amount, Decimal) else Decimal(str(amount))


def _lock_balance(user) -> CreditBalance:
    """Get-or-create the balance, then re-fetch it under a row lock."""
    balance, _ = CreditBalance.objects.get_or_create(user=user)
    return CreditBalance.objects.select_for_update().get(pk=balance.pk)


def _record(
    *,
    user,
    transaction_type: str,
    amount: Decimal,
    balance_after: Decimal,
    description: str,
    reference_id: UUID | None,
    created_by,
) -> CreditLedger:
    return CreditLedger.objects.create(
        user=user,
        transaction_type=transaction_type,
        amount=amount,
        balance_after=balance_after,
        description=description or "",
        reference_id=reference_id,
        created_by=created_by,
    )


@transaction.atomic
def grant_credits(
    *,
    user,
    amount,
    description: str = "",
    reference_id: UUID | None = None,
    created_by=None,
) -> CreditLedger:
    amount = _to_decimal(amount)
    if amount <= ZERO:
        raise InvalidCreditAmount("Grant amount must be positive.")
    balance = _lock_balance(user)
    balance.available_credits += amount
    balance.lifetime_credits += amount
    balance.save(
        update_fields=["available_credits", "lifetime_credits", "updated_at"]
    )
    return _record(
        user=user,
        transaction_type=CreditLedger.GRANT,
        amount=amount,
        balance_after=balance.available_credits,
        description=description,
        reference_id=reference_id,
        created_by=created_by,
    )


@transaction.atomic
def adjust_credits(
    *,
    user,
    amount,
    description: str = "",
    reference_id: UUID | None = None,
    created_by=None,
) -> CreditLedger:
    """Admin adjustment — ``amount`` is signed (positive or negative, non-zero)."""
    amount = _to_decimal(amount)
    if amount == ZERO:
        raise InvalidCreditAmount("Adjustment amount must be non-zero.")
    balance = _lock_balance(user)
    if balance.available_credits + amount < ZERO:
        raise InsufficientCredits(
            "Adjustment would drive the available balance negative."
        )
    balance.available_credits += amount
    if amount > ZERO:
        balance.lifetime_credits += amount
    balance.save(
        update_fields=["available_credits", "lifetime_credits", "updated_at"]
    )
    return _record(
        user=user,
        transaction_type=CreditLedger.ADJUSTMENT,
        amount=amount,
        balance_after=balance.available_credits,
        description=description,
        reference_id=reference_id,
        created_by=created_by,
    )


@transaction.atomic
def reserve_credits(
    *,
    user,
    amount,
    description: str = "",
    reference_id: UUID | None = None,
    created_by=None,
) -> CreditLedger:
    amount = _to_decimal(amount)
    if amount <= ZERO:
        raise InvalidCreditAmount("Reservation amount must be positive.")
    balance = _lock_balance(user)
    if balance.available_credits < amount:
        raise InsufficientCredits("Not enough available credits to reserve.")
    balance.available_credits -= amount
    balance.reserved_credits += amount
    balance.save(
        update_fields=["available_credits", "reserved_credits", "updated_at"]
    )
    return _record(
        user=user,
        transaction_type=CreditLedger.RESERVATION,
        amount=-amount,
        balance_after=balance.available_credits,
        description=description,
        reference_id=reference_id,
        created_by=created_by,
    )


@transaction.atomic
def commit_reserved_credits(
    *,
    user,
    amount,
    description: str = "",
    reference_id: UUID | None = None,
    created_by=None,
) -> CreditLedger:
    """Finalize a reservation: consume reserved credits (available unchanged)."""
    amount = _to_decimal(amount)
    if amount <= ZERO:
        raise InvalidCreditAmount("Commit amount must be positive.")
    balance = _lock_balance(user)
    if balance.reserved_credits < amount:
        raise InsufficientReservedCredits(
            "Cannot commit more than is currently reserved."
        )
    balance.reserved_credits -= amount
    balance.save(update_fields=["reserved_credits", "updated_at"])
    return _record(
        user=user,
        transaction_type=CreditLedger.DEBIT,
        amount=-amount,
        balance_after=balance.available_credits,
        description=description,
        reference_id=reference_id,
        created_by=created_by,
    )


@transaction.atomic
def release_reserved_credits(
    *,
    user,
    amount,
    description: str = "",
    reference_id: UUID | None = None,
    created_by=None,
) -> CreditLedger:
    """Roll back a reservation: return reserved credits to available."""
    amount = _to_decimal(amount)
    if amount <= ZERO:
        raise InvalidCreditAmount("Release amount must be positive.")
    balance = _lock_balance(user)
    if balance.reserved_credits < amount:
        raise InsufficientReservedCredits(
            "Cannot release more than is currently reserved."
        )
    balance.reserved_credits -= amount
    balance.available_credits += amount
    balance.save(
        update_fields=["available_credits", "reserved_credits", "updated_at"]
    )
    return _record(
        user=user,
        transaction_type=CreditLedger.RELEASE,
        amount=amount,
        balance_after=balance.available_credits,
        description=description,
        reference_id=reference_id,
        created_by=created_by,
    )
