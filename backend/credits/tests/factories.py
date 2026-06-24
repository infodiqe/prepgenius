from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from credits.models import CreditBalance, CreditLedger


class CreditBalanceFactory(DjangoModelFactory):
    class Meta:
        model = CreditBalance
        skip_postgeneration_save = True

    user = factory.SubFactory("accounts.tests.factories.UserFactory")
    available_credits = Decimal("0.00")
    reserved_credits = Decimal("0.00")
    lifetime_credits = Decimal("0.00")


class CreditLedgerFactory(DjangoModelFactory):
    class Meta:
        model = CreditLedger
        skip_postgeneration_save = True

    user = factory.SubFactory("accounts.tests.factories.UserFactory")
    transaction_type = CreditLedger.GRANT
    amount = Decimal("10.00")
    balance_after = Decimal("10.00")
    description = ""
