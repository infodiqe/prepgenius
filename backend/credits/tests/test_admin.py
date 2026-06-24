import pytest
from django.contrib.admin.sites import AdminSite

from credits.admin import CreditBalanceAdmin, CreditLedgerAdmin
from credits.models import CreditBalance, CreditLedger

pytestmark = pytest.mark.django_db


class _Req:
    pass


@pytest.mark.parametrize(
    "model,admin_cls",
    [(CreditBalance, CreditBalanceAdmin), (CreditLedger, CreditLedgerAdmin)],
)
class TestCreditsAdminReadOnly:
    def test_no_add(self, model, admin_cls):
        admin = admin_cls(model, AdminSite())
        assert admin.has_add_permission(_Req()) is False

    def test_no_change(self, model, admin_cls):
        admin = admin_cls(model, AdminSite())
        assert admin.has_change_permission(_Req()) is False

    def test_no_delete(self, model, admin_cls):
        admin = admin_cls(model, AdminSite())
        assert admin.has_delete_permission(_Req()) is False
