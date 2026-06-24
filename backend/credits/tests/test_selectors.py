from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from credits.selectors import (
    get_credit_balance,
    get_credit_ledger,
    get_credit_summary,
)
from credits.tests.factories import CreditBalanceFactory, CreditLedgerFactory

pytestmark = pytest.mark.django_db


class TestGetCreditBalance:
    def test_returns_balance(self):
        user = UserFactory()
        balance = CreditBalanceFactory(user=user)
        assert get_credit_balance(user=user) == balance

    def test_returns_none_when_absent(self):
        assert get_credit_balance(user=UserFactory()) is None


class TestGetCreditLedger:
    def test_newest_first(self):
        user = UserFactory()
        first = CreditLedgerFactory(user=user)
        second = CreditLedgerFactory(user=user)
        ids = list(get_credit_ledger(user=user).values_list("id", flat=True))
        assert ids == [second.id, first.id]

    def test_scoped_to_user(self):
        user = UserFactory()
        CreditLedgerFactory(user=user)
        CreditLedgerFactory(user=UserFactory())
        assert get_credit_ledger(user=user).count() == 1


class TestGetCreditSummary:
    def test_reads_balance(self):
        user = UserFactory()
        CreditBalanceFactory(
            user=user,
            available_credits=Decimal("30.00"),
            reserved_credits=Decimal("5.00"),
            lifetime_credits=Decimal("100.00"),
        )
        assert get_credit_summary(user=user) == {
            "available": Decimal("30.00"),
            "reserved": Decimal("5.00"),
            "lifetime": Decimal("100.00"),
        }

    def test_zero_when_no_balance(self):
        assert get_credit_summary(user=UserFactory()) == {
            "available": Decimal("0.00"),
            "reserved": Decimal("0.00"),
            "lifetime": Decimal("0.00"),
        }
