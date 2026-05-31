from uuid import UUID

from django.core.exceptions import ObjectDoesNotExist
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models.rbac import PLATFORM_ADMIN
from accounts.models import UserRole
from analytics.selectors import (
    get_attempt_results,
    get_attempt_analytics,
    get_dashboard_summary,
    get_active_weak_topics,
    get_weak_topic_recommendations,
)
from analytics.api.serializers import (
    AttemptResultsSerializer,
    AttemptAnalyticsSerializer,
    DashboardSerializer,
)
from attempts.models import ExamAttempt


def _is_admin(user) -> bool:
    """Return True if the user has platform-admin/content-manager role, is staff, or is superuser."""
    return (
        user.is_superuser
        or user.is_staff
        or UserRole.objects.filter(
            user=user,
            role__name__in=[PLATFORM_ADMIN, "content_manager"],
        ).exists()
    )


def _verify_attempt_access_or_404(*, attempt_id: UUID, user) -> ExamAttempt:
    """Helper to verify attempt existence and enforce student ownership or admin override."""
    try:
        attempt = ExamAttempt.objects.get(id=attempt_id)
    except ExamAttempt.DoesNotExist:
        raise NotFound(f"ExamAttempt not found: {attempt_id}")

    if not (attempt.user_id == user.id or _is_admin(user)):
        raise PermissionDenied("You do not have permission to access this attempt's results.")

    return attempt


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve attempt results",
        description="Get result metadata and dynamically computed pass/needs-work status for a scored attempt.",
        responses={
            200: AttemptResultsSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt not found"),
        },
    ),
)
class AttemptResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: UUID):
        _verify_attempt_access_or_404(attempt_id=pk, user=request.user)
        try:
            results = get_attempt_results(attempt_id=pk)
        except ValueError as exc:
            raise ValidationError(str(exc))

        serializer = AttemptResultsSerializer(results)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve attempt analytics",
        description="Get subject and topic accuracy and average time breakdowns for a scored attempt.",
        responses={
            200: AttemptAnalyticsSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt not found"),
        },
    ),
)
class AttemptAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: UUID):
        _verify_attempt_access_or_404(attempt_id=pk, user=request.user)
        try:
            analytics_data = get_attempt_analytics(attempt_id=pk)
        except ValueError as exc:
            raise ValidationError(str(exc))

        serializer = AttemptAnalyticsSerializer(analytics_data)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        summary="Student dashboard summary",
        description=(
            "Returns streak, daily progress, overall accuracy, recent activity, "
            "active weak topics and practice recommendations for the authenticated student. "
            "Admin users may pass an optional `exam_id` query parameter to view any student's dashboard."
        ),
        parameters=[
            OpenApiParameter(
                name="exam_id",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="UUID of the exam. Falls back to the user's target_exam if omitted.",
            ),
        ],
        responses={
            200: DashboardSerializer,
            400: OpenApiResponse(description="exam_id is required but not set"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Exam not found"),
        },
    ),
)
class DashboardView(APIView):
    """
    GET /api/v1/dashboard/

    Read-only. Performs no writes, no analytics recalculation, and no rollup generation.
    Consumes selectors exclusively:
      - get_dashboard_summary()
      - get_active_weak_topics()
      - get_weak_topic_recommendations()
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # ── Resolve exam_id ───────────────────────────────────────────────────
        exam_id_param = request.query_params.get("exam_id")
        if exam_id_param:
            try:
                exam_id = UUID(exam_id_param)
            except (ValueError, AttributeError):
                raise ValidationError({"exam_id": "Must be a valid UUID."})
        elif user.target_exam_id:
            exam_id = user.target_exam_id
        else:
            raise ValidationError(
                {"exam_id": "exam_id is required (or set a target exam on your profile)."}
            )

        # Verify the exam exists (lightweight — only imports Exam model here)
        from exams.models import Exam

        if not Exam.objects.filter(id=exam_id).exists():
            raise NotFound(f"Exam not found: {exam_id}")

        # ── Ownership / admin check ───────────────────────────────────────────
        # Students may only view their own dashboard.
        # Admins (platform_admin, content_manager, staff, superuser) may view any.
        # For MVP there is no `target_user_id` param; students always see their own data.
        user_id = user.id

        # ── Consume selectors (read-only, no writes) ──────────────────────────
        summary = get_dashboard_summary(user_id=user_id, exam_id=exam_id)
        weak_topics = get_active_weak_topics(user_id=user_id, exam_id=exam_id)
        recommendations = get_weak_topic_recommendations(user_id=user_id, exam_id=exam_id)

        payload = {
            "streak": summary["streak"],
            "daily_questions_attempted": summary["daily_questions_attempted"],
            "daily_target": summary["daily_target"],
            "overall_accuracy": summary["overall_accuracy"],
            "recent_activity": summary["recent_activity"],
            "weak_topics": weak_topics,
            "recommendations": recommendations,
        }

        serializer = DashboardSerializer(payload)
        return Response(serializer.data)

