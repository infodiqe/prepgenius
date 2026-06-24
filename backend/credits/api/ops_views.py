"""
Credits Operations API views — OPS-BE-02 (read + admin adjustment).

Gated to the operational roles via OPS-BE-01's ``IsOpsUserViewer``. Reads go
through selectors; the adjustment goes through the credits service layer (never a
direct model write) inside its own atomic transaction, recording ``created_by``
for the audit trail.
"""
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOpsUserViewer
from accounts.selectors.ops_user_selectors import get_ops_user
from credits.api.serializers import (
    CreditAdjustRequestSerializer,
    CreditLedgerSerializer,
    CreditSummarySerializer,
    OpsUserCreditsSerializer,
)
from credits.exceptions import CreditDomainError
from credits.selectors import get_credit_ledger, get_credit_summary
from credits.services import adjust_credits

OPS_LEDGER_PREVIEW = 20


@extend_schema(
    operation_id="ops_user_credits",
    summary="A user's credit balance + recent ledger (read-only, ops)",
    tags=["ops"],
    responses={200: OpsUserCreditsSerializer},
)
class OpsUserCreditsView(APIView):
    permission_classes = [IsOpsUserViewer]
    http_method_names = ["get"]

    def get(self, request, user_id, *args, **kwargs) -> Response:
        user = get_ops_user(user_id=user_id)
        summary = get_credit_summary(user=user)
        recent = list(get_credit_ledger(user=user)[:OPS_LEDGER_PREVIEW])
        payload = {
            "balance": summary["available"],
            "reserved": summary["reserved"],
            "lifetime": summary["lifetime"],
            "recent_ledger": recent,
        }
        return Response(
            OpsUserCreditsSerializer(payload).data, status=status.HTTP_200_OK
        )


@extend_schema(
    operation_id="ops_user_credits_adjust",
    summary="Apply an admin credit adjustment (signed) to a user",
    tags=["ops"],
    request=CreditAdjustRequestSerializer,
    responses={200: OpsUserCreditsSerializer},
)
class OpsUserCreditsAdjustView(APIView):
    permission_classes = [IsOpsUserViewer]
    http_method_names = ["post"]

    def post(self, request, user_id, *args, **kwargs) -> Response:
        user = get_ops_user(user_id=user_id)
        serializer = CreditAdjustRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            entry = adjust_credits(
                user=user,
                amount=serializer.validated_data["amount"],
                description=serializer.validated_data.get("description", ""),
                created_by=request.user,
            )
        except CreditDomainError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        summary = get_credit_summary(user=user)
        return Response(
            {
                "balance": CreditSummarySerializer(summary).data,
                "entry": CreditLedgerSerializer(entry).data,
            },
            status=status.HTTP_200_OK,
        )
