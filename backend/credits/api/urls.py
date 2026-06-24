"""Credits user-facing routes — OPS-BE-02. Mounted under /api/v1/credits/."""
from django.urls import path

from credits.api.views import CreditBalanceView, CreditLedgerView

urlpatterns = [
    path("balance/", CreditBalanceView.as_view(), name="credits-balance"),
    path("ledger/", CreditLedgerView.as_view(), name="credits-ledger"),
]
