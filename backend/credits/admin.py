"""
Credits admin — OPS-BE-02.

Both models are registered READ-ONLY. The ledger is append-only and the balance
is mutated only by the credits services (adjustments flow through the API/service
layer, never direct admin writes), so no add / change / delete is permitted here.
"""
from django.contrib import admin

from credits.models import CreditBalance, CreditLedger


class _ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(CreditBalance)
class CreditBalanceAdmin(_ReadOnlyAdmin):
    list_display = (
        "user",
        "available_credits",
        "reserved_credits",
        "lifetime_credits",
        "updated_at",
    )
    search_fields = ("user__email",)
    readonly_fields = (
        "id",
        "user",
        "available_credits",
        "reserved_credits",
        "lifetime_credits",
        "created_at",
        "updated_at",
    )
    ordering = ("-updated_at",)


@admin.register(CreditLedger)
class CreditLedgerAdmin(_ReadOnlyAdmin):
    list_display = (
        "created_at",
        "user",
        "transaction_type",
        "amount",
        "balance_after",
        "created_by",
    )
    list_filter = ("transaction_type",)
    search_fields = ("user__email", "description", "reference_id")
    readonly_fields = (
        "id",
        "user",
        "transaction_type",
        "amount",
        "balance_after",
        "description",
        "reference_id",
        "created_by",
        "created_at",
    )
    ordering = ("-created_at",)
