"""Credits API serializers — OPS-BE-02 (read shapes + the adjustment request)."""
from decimal import Decimal

from rest_framework import serializers

from credits.models import CreditLedger


class CreditSummarySerializer(serializers.Serializer):
    """``{available, reserved, lifetime}`` — money fields as exact decimals."""

    available = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    reserved = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    lifetime = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )


class CreditLedgerSerializer(serializers.ModelSerializer):
    """One immutable ledger entry (read-only)."""

    class Meta:
        model = CreditLedger
        fields = [
            "id",
            "transaction_type",
            "amount",
            "balance_after",
            "description",
            "reference_id",
            "created_by",
            "created_at",
        ]
        read_only_fields = fields


class OpsUserCreditsSerializer(serializers.Serializer):
    """Ops User 360 credits panel: balance + last-N ledger entries."""

    balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    reserved = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    lifetime = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    recent_ledger = CreditLedgerSerializer(many=True, read_only=True)


class CreditAdjustRequestSerializer(serializers.Serializer):
    """Validates an admin credit adjustment (signed, non-zero amount)."""

    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_amount(self, value: Decimal) -> Decimal:
        if value == Decimal("0"):
            raise serializers.ValidationError("Adjustment amount must be non-zero.")
        return value
