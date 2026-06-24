"""
Operations analytics views — OPS-BE-03 (read-only, operator-wide).

Thin HTTP layer: authorize, delegate to a service, serialize. No business logic
or queries live here. Access is restricted to the operational roles via OPS-BE-01's
``IsOpsUserViewer`` (reused, no duplicate RBAC, no superuser shortcut). These
endpoints are platform-wide and separate from the learner-scoped analytics views,
which are unchanged.
"""
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOpsUserViewer
from analytics.api.ops_serializers import (
    OpsContentDistributionSerializer,
    OpsCreditAnalyticsSerializer,
    OpsOverviewSerializer,
    OpsReadinessDistributionSerializer,
    OpsReviewAnalyticsSerializer,
)
from analytics.services.ops_analytics_services import (
    get_ops_content_distribution,
    get_ops_credit_analytics,
    get_ops_overview,
    get_ops_readiness_distribution,
    get_ops_review_analytics,
)


class _OpsAnalyticsView(APIView):
    """Shared base: ops RBAC + GET-only, no logic."""

    permission_classes = [IsOpsUserViewer]
    http_method_names = ["get"]


@extend_schema(
    operation_id="ops_analytics_overview",
    summary="Operator overview metrics (read-only)",
    tags=["ops"],
    responses={200: OpsOverviewSerializer},
)
class OpsAnalyticsOverviewView(_OpsAnalyticsView):
    """API 1 — GET /api/v1/ops/analytics/overview/."""

    def get(self, request, *args, **kwargs) -> Response:
        return Response(OpsOverviewSerializer(get_ops_overview()).data)


@extend_schema(
    operation_id="ops_analytics_readiness",
    summary="Readiness distribution across learners (read-only)",
    tags=["ops"],
    responses={200: OpsReadinessDistributionSerializer},
)
class OpsAnalyticsReadinessView(_OpsAnalyticsView):
    """API 2 — GET /api/v1/ops/analytics/readiness/."""

    def get(self, request, *args, **kwargs) -> Response:
        return Response(
            OpsReadinessDistributionSerializer(
                get_ops_readiness_distribution()
            ).data
        )


@extend_schema(
    operation_id="ops_analytics_content",
    summary="Question counts by review state (read-only)",
    tags=["ops"],
    responses={200: OpsContentDistributionSerializer},
)
class OpsAnalyticsContentView(_OpsAnalyticsView):
    """API 3 — GET /api/v1/ops/analytics/content/."""

    def get(self, request, *args, **kwargs) -> Response:
        return Response(
            OpsContentDistributionSerializer(get_ops_content_distribution()).data
        )


@extend_schema(
    operation_id="ops_analytics_review",
    summary="Review-pool and decision metrics (read-only)",
    tags=["ops"],
    responses={200: OpsReviewAnalyticsSerializer},
)
class OpsAnalyticsReviewView(_OpsAnalyticsView):
    """API 4 — GET /api/v1/ops/analytics/review/."""

    def get(self, request, *args, **kwargs) -> Response:
        return Response(
            OpsReviewAnalyticsSerializer(get_ops_review_analytics()).data
        )


@extend_schema(
    operation_id="ops_analytics_credits",
    summary="Credit ledger movement and active wallets (read-only)",
    tags=["ops"],
    responses={200: OpsCreditAnalyticsSerializer},
)
class OpsAnalyticsCreditsView(_OpsAnalyticsView):
    """API 5 — GET /api/v1/ops/analytics/credits/."""

    def get(self, request, *args, **kwargs) -> Response:
        return Response(
            OpsCreditAnalyticsSerializer(get_ops_credit_analytics()).data
        )
