"""
Operations User 360 views — OPS-BE-01 (read-only).

Thin HTTP layer: validate input, delegate reads to selectors, serialize. No
business logic lives here. Access is restricted to the four operational roles via
``IsOpsUserViewer`` (RBAC). The detail endpoint reuses the existing
``UserProfileSerializer`` so its shape matches GET /auth/profile/.
"""
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.views import APIView


class OpsUserCursorPagination(CursorPagination):
    """Cursor pagination over the User model's ``created_at`` (newest first)."""

    ordering = "-created_at"
    page_size = 20

from accounts.api.ops_serializers import (
    OpsUserListSerializer,
    OpsUserQuerySerializer,
    OpsUserSummarySerializer,
)
from accounts.api.serializers import UserProfileSerializer
from accounts.permissions import IsOpsUserViewer
from accounts.selectors.ops_user_selectors import (
    get_ops_user,
    get_ops_user_summary,
    list_ops_users,
)


@extend_schema(
    operation_id="ops_users_list",
    summary="List users for operations (read-only, paginated)",
    tags=["ops"],
    parameters=[
        OpenApiParameter("search", str, description="Match full name or email."),
        OpenApiParameter("role", str, description="Filter by RBAC role name."),
        OpenApiParameter(
            "status",
            str,
            description="Filter by account status (pending/active/suspended/deleted).",
        ),
        OpenApiParameter("target_exam", str, description="Filter by target exam id."),
    ],
)
class OpsUserListView(ListAPIView):
    """API 1 — GET /api/v1/ops/users/ (cursor-paginated, searchable, filterable)."""

    permission_classes = [IsOpsUserViewer]
    serializer_class = OpsUserListSerializer
    pagination_class = OpsUserCursorPagination

    def get_queryset(self):
        params = OpsUserQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        return list_ops_users(**params.validated_data)


@extend_schema(
    operation_id="ops_users_retrieve",
    summary="Retrieve a user's profile for operations (read-only)",
    tags=["ops"],
    responses={200: UserProfileSerializer},
)
class OpsUserDetailView(RetrieveAPIView):
    """API 2 — GET /api/v1/ops/users/{id}/ (reuses the profile serializer)."""

    permission_classes = [IsOpsUserViewer]
    serializer_class = UserProfileSerializer
    lookup_url_kwarg = "user_id"

    def get_object(self) -> object:
        return get_ops_user(user_id=self.kwargs["user_id"])


@extend_schema(
    operation_id="ops_users_summary",
    summary="Operational summary for a user (read-only)",
    tags=["ops"],
    responses={200: OpsUserSummarySerializer},
)
class OpsUserSummaryView(APIView):
    """API 3 — GET /api/v1/ops/users/{id}/summary/ (existing analytics only)."""

    permission_classes = [IsOpsUserViewer]
    http_method_names = ["get"]

    def get(self, request, user_id, *args, **kwargs) -> Response:
        user = get_ops_user(user_id=user_id)
        summary = get_ops_user_summary(user=user)
        return Response(
            OpsUserSummarySerializer(summary).data,
            status=status.HTTP_200_OK,
        )
