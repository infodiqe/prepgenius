from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction

from accounts.tests.factories import UserFactory
from credits.exceptions import LedgerAppendOnlyError
from credits.models import CreditBalance, CreditLedger
from credits.tests.factories import CreditBalanceFactory, CreditLedgerFactory

pytestmark = pytest.mark.django_db


class TestCreditBalanceModel:
    def test_one_balance_per_user(self):
        user = UserFactory()
        CreditBalanceFactory(user=user)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                CreditBalanceFactory(user=user)

    def test_negative_available_is_rejected_by_db_constraint(self):
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                CreditBalanceFactory(available_credits=Decimal("-1.00"))

    def test_str(self):
        balance = CreditBalanceFactory(available_credits=Decimal("5.00"))
        assert "available=5.00" in str(balance)


class TestCreditLedgerAppendOnly:
    def test_insert_is_allowed(self):
        entry = CreditLedgerFactory()
        assert CreditLedger.objects.filter(pk=entry.pk).exists()

    def test_update_is_blocked(self):
        entry = CreditLedgerFactory()
        entry.amount = Decimal("999.00")
        with pytest.raises(LedgerAppendOnlyError):
            entry.save()

    def test_delete_is_blocked(self):
        entry = CreditLedgerFactory()
        with pytest.raises(LedgerAppendOnlyError):
            entry.delete()

    def test_str(self):
        entry = CreditLedgerFactory(transaction_type=CreditLedger.GRANT)
        assert "grant" in str(entry)
