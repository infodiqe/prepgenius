from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from credits.exceptions import (
    InsufficientCredits,
    InsufficientReservedCredits,
    InvalidCreditAmount,
)
from credits.models import CreditBalance, CreditLedger
from credits.selectors import get_credit_balance
from credits.services import (
    adjust_credits,
    commit_reserved_credits,
    grant_credits,
    release_reserved_credits,
    reserve_credits,
)

pytestmark = pytest.mark.django_db

D = Decimal


def _bal(user):
    return get_credit_balance(user=user)


class TestGrant:
    def test_grant_increases_available_and_lifetime_and_records_ledger(self):
        user = UserFactory()
        admin = UserFactory()
        entry = grant_credits(
            user=user, amount=D("100.00"), description="welcome", created_by=admin
        )
        b = _bal(user)
        assert b.available_credits == D("100.00")
        assert b.lifetime_credits == D("100.00")
        assert b.reserved_credits == D("0.00")
        assert entry.transaction_type == CreditLedger.GRANT
        assert entry.amount == D("100.00")
        assert entry.balance_after == D("100.00")
        assert entry.created_by == admin

    def test_non_positive_grant_is_rejected(self):
        user = UserFactory()
        with pytest.raises(InvalidCreditAmount):
            grant_credits(user=user, amount=D("0"))
        with pytest.raises(InvalidCreditAmount):
            grant_credits(user=user, amount=D("-5"))


class TestAdjust:
    def test_positive_adjustment_adds_to_available_and_lifetime(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("50.00"))
        entry = adjust_credits(user=user, amount=D("20.00"))
        b = _bal(user)
        assert b.available_credits == D("70.00")
        assert b.lifetime_credits == D("70.00")
        assert entry.amount == D("20.00")
        assert entry.transaction_type == CreditLedger.ADJUSTMENT

    def test_negative_adjustment_reduces_available_only(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("50.00"))
        adjust_credits(user=user, amount=D("-30.00"))
        b = _bal(user)
        assert b.available_credits == D("20.00")
        assert b.lifetime_credits == D("50.00")  # lifetime unchanged

    def test_zero_adjustment_is_rejected(self):
        user = UserFactory()
        with pytest.raises(InvalidCreditAmount):
            adjust_credits(user=user, amount=D("0"))

    def test_negative_adjustment_cannot_go_below_zero(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("10.00"))
        with pytest.raises(InsufficientCredits):
            adjust_credits(user=user, amount=D("-25.00"))
        assert _bal(user).available_credits == D("10.00")


class TestReserveCommitRelease:
    def test_reserve_moves_available_to_reserved(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("100.00"))
        entry = reserve_credits(user=user, amount=D("40.00"))
        b = _bal(user)
        assert b.available_credits == D("60.00")
        assert b.reserved_credits == D("40.00")
        assert entry.amount == D("-40.00")
        assert entry.transaction_type == CreditLedger.RESERVATION

    def test_reserve_more_than_available_is_rejected(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("30.00"))
        with pytest.raises(InsufficientCredits):
            reserve_credits(user=user, amount=D("31.00"))

    def test_commit_consumes_reserved_without_touching_available(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("100.00"))
        reserve_credits(user=user, amount=D("40.00"))
        entry = commit_reserved_credits(user=user, amount=D("25.00"))
        b = _bal(user)
        assert b.reserved_credits == D("15.00")
        assert b.available_credits == D("60.00")  # unchanged at commit
        assert entry.amount == D("-25.00")
        assert entry.transaction_type == CreditLedger.DEBIT

    def test_release_returns_reserved_to_available(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("100.00"))
        reserve_credits(user=user, amount=D("40.00"))
        entry = release_reserved_credits(user=user, amount=D("40.00"))
        b = _bal(user)
        assert b.reserved_credits == D("0.00")
        assert b.available_credits == D("100.00")
        assert entry.amount == D("40.00")
        assert entry.transaction_type == CreditLedger.RELEASE

    def test_commit_more_than_reserved_is_rejected(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("100.00"))
        reserve_credits(user=user, amount=D("10.00"))
        with pytest.raises(InsufficientReservedCredits):
            commit_reserved_credits(user=user, amount=D("11.00"))

    def test_release_more_than_reserved_is_rejected(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("100.00"))
        with pytest.raises(InsufficientReservedCredits):
            release_reserved_credits(user=user, amount=D("1.00"))

    @pytest.mark.parametrize(
        "service",
        [reserve_credits, commit_reserved_credits, release_reserved_credits],
    )
    def test_non_positive_amounts_rejected(self, service):
        user = UserFactory()
        with pytest.raises(InvalidCreditAmount):
            service(user=user, amount=D("0"))


class TestNegativeBalanceAndAtomicity:
    def test_failed_reserve_rolls_back_balance_and_ledger(self):
        # Fresh user: a failing reserve must leave NO balance row and NO ledger
        # entry (the whole operation is atomic).
        user = UserFactory()
        with pytest.raises(InsufficientCredits):
            reserve_credits(user=user, amount=D("10.00"))
        assert CreditBalance.objects.filter(user=user).count() == 0
        assert CreditLedger.objects.filter(user=user).count() == 0

    def test_no_oversell_under_sequential_reservations(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("100.00"))
        reserve_credits(user=user, amount=D("60.00"))
        with pytest.raises(InsufficientCredits):
            reserve_credits(user=user, amount=D("60.00"))
        b = _bal(user)
        assert b.available_credits == D("40.00")
        assert b.reserved_credits == D("60.00")


class TestLocking:
    def test_balance_row_is_locked_with_select_for_update(self, monkeypatch):
        """The mutating path must acquire a row lock (no double-spend)."""
        user = UserFactory()
        original = CreditBalance.objects.select_for_update
        flag = {"called": False}

        def spy(*args, **kwargs):
            flag["called"] = True
            return original(*args, **kwargs)

        monkeypatch.setattr(CreditBalance.objects, "select_for_update", spy)
        grant_credits(user=user, amount=D("10.00"))
        assert flag["called"] is True
