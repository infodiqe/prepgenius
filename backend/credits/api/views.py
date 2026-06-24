"""
Credits user-facing API views — OPS-BE-02 (read-only).

Thin HTTP layer: delegate reads to selectors, serialize. The authenticated user
only ever sees their own balance/ledger. No business logic here.
"""
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from credits.api.serializers import CreditLedgerSerializer, CreditSummarySerializer
from credits.selectors import get_credit_ledger, get_credit_summary


class CreditLedgerCursorPagination(CursorPagination):
    """Cursor pagination over the ledger's ``created_at`` (newest first)."""

    ordering = "-created_at"
    page_size = 20


@extend_schema(
    operation_id="credits_balance",
    summary="Get the authenticated user's credit balance",
    tags=["credits"],
    responses={200: CreditSummarySerializer},
)
class CreditBalanceView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get"]

    def get(self, request, *args, **kwargs) -> Response:
        summary = get_credit_summary(user=request.user)
        return Response(
            CreditSummarySerializer(summary).data, status=status.HTTP_200_OK
        )


@extend_schema(
    operation_id="credits_ledger",
    summary="List the authenticated user's credit ledger (cursor-paginated)",
    tags=["credits"],
)
class CreditLedgerView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CreditLedgerSerializer
    pagination_class = CreditLedgerCursorPagination

    def get_queryset(self):
        return get_credit_ledger(user=self.request.user)
