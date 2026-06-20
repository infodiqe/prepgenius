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
    get_user_topic_performance,
    get_latest_readiness,
    get_attempt_trend,
    get_section_trend,
    get_readiness_trend,
)
from analytics.api.serializers import (
    AttemptResultsSerializer,
    AttemptAnalyticsSerializer,
    DashboardSerializer,
    UserTopicPerformanceSerializer,
    ReadinessSerializer,
    AttemptTrendSerializer,
    SectionTrendSerializer,
    ReadinessTrendSerializer,
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


def _resolve_exam_id(request) -> UUID:
    """Resolve + validate the exam_id for self-scoped analytics endpoints.

    Identical to DashboardView/ReadinessView resolution: query param → user's
    target exam → 400; invalid UUID → 400; unknown exam → 404.
    """
    user = request.user
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

    from exams.models import Exam

    if not Exam.objects.filter(id=exam_id).exists():
        raise NotFound(f"Exam not found: {exam_id}")

    return exam_id


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


@extend_schema_view(
    get=extend_schema(
        summary="List topic mastery",
        description=(
            "Returns the authenticated student's per-topic performance "
            "(attempts, correct, success rate, average time, last practised) "
            "for an exam. Read-only; values are backend-computed by the "
            "analytics rollup. Falls back to the user's target exam when "
            "exam_id is omitted."
        ),
        parameters=[
            OpenApiParameter(
                name="exam_id",
                type=str,
                required=False,
                location=OpenApiParameter.QUERY,
                description="UUID of the exam. Falls back to the user's target_exam if omitted.",
            ),
        ],
        responses={
            200: UserTopicPerformanceSerializer(many=True),
            400: OpenApiResponse(description="exam_id is required but not set / invalid"),
            401: OpenApiResponse(description="Not authenticated"),
            404: OpenApiResponse(description="Exam not found"),
        },
    ),
)
class TopicPerformanceView(APIView):
    """
    GET /api/v1/analytics/topic-performance/?exam_id=<uuid>

    Read-only (T23). Performs no writes and no analytics recalculation; consumes
    the `get_user_topic_performance` selector exclusively. Students always see
    their own data — there is no target_user_id parameter, so cross-user access
    is impossible (mirrors DashboardView's ownership model).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # ── Resolve exam_id (consistent with DashboardView) ───────────────────
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

        from exams.models import Exam

        if not Exam.objects.filter(id=exam_id).exists():
            raise NotFound(f"Exam not found: {exam_id}")

        # ── Read-only selector; always scoped to the requesting user ──────────
        performance = get_user_topic_performance(user_id=user.id, exam_id=exam_id)

        serializer = UserTopicPerformanceSerializer(performance, many=True)
        return Response(serializer.data)


@extend_schema_view(
    get=extend_schema(
        summary="Exam readiness",
        description=(
            "Returns the authenticated student's latest exam readiness score and "
            "band for an exam, plus the component breakdown. Read-only; the score "
            "is computed by the analytics rollup (T22). Returns a 'provisional' "
            "status when the student has no scored exam-type attempt yet. Falls "
            "back to the user's target exam when exam_id is omitted."
        ),
        parameters=[
            OpenApiParameter(
                name="exam_id",
                type=str,
                required=False,
                location=OpenApiParameter.QUERY,
                description="UUID of the exam. Falls back to the user's target_exam if omitted.",
            ),
        ],
        responses={
            200: ReadinessSerializer,
            400: OpenApiResponse(description="exam_id is required but not set / invalid"),
            401: OpenApiResponse(description="Not authenticated"),
            404: OpenApiResponse(description="Exam not found"),
        },
    ),
)
class ReadinessView(APIView):
    """
    GET /api/v1/analytics/readiness/?exam_id=<uuid>

    Read-only (T22). Returns the latest ExamReadinessScore for the requesting
    user, or a provisional payload when none exists. Students always see their
    own data — no target_user_id parameter (mirrors DashboardView ownership).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

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

        from exams.models import Exam

        if not Exam.objects.filter(id=exam_id).exists():
            raise NotFound(f"Exam not found: {exam_id}")

        latest = get_latest_readiness(user_id=user.id, exam_id=exam_id)
        if latest is None:
            payload = {
                "status": "provisional",
                "score": None,
                "band": "provisional",
                "components": {},
                "computed_at": None,
            }
        else:
            components = latest.components or {}
            payload = {
                "status": components.get("status", "scored"),
                "score": latest.score,
                "band": components.get("band"),
                "components": components,
                "computed_at": latest.computed_at,
            }

        return Response(ReadinessSerializer(payload).data)


# ═══════════════════════════════════════════════════════════════════════
# TRENDS & HISTORY (T24)
# ═══════════════════════════════════════════════════════════════════════

_TREND_EXAM_PARAM = OpenApiParameter(
    name="exam_id",
    type=str,
    required=False,
    location=OpenApiParameter.QUERY,
    description="UUID of the exam. Falls back to the user's target_exam if omitted.",
)
_TREND_ERRORS = {
    400: OpenApiResponse(description="exam_id is required but not set / invalid"),
    401: OpenApiResponse(description="Not authenticated"),
    404: OpenApiResponse(description="Exam not found"),
}


@extend_schema_view(
    get=extend_schema(
        summary="Attempt score trend",
        description="Chronological scored-attempt history for the authenticated student (read-only).",
        parameters=[_TREND_EXAM_PARAM],
        responses={200: AttemptTrendSerializer(many=True), **_TREND_ERRORS},
    ),
)
class AttemptTrendView(APIView):
    """GET /api/v1/analytics/trends/attempts/?exam_id=<uuid> — self-scoped."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        exam_id = _resolve_exam_id(request)
        data = get_attempt_trend(user_id=request.user.id, exam_id=exam_id)
        return Response(AttemptTrendSerializer(data, many=True).data)


@extend_schema_view(
    get=extend_schema(
        summary="Section accuracy trend",
        description=(
            "Per-section (subject or topic) accuracy history grouped by scope, "
            "bounded to a recent window of scored attempts (read-only)."
        ),
        parameters=[
            _TREND_EXAM_PARAM,
            OpenApiParameter(
                name="scope",
                type=str,
                required=False,
                location=OpenApiParameter.QUERY,
                description="'subject' (default) or 'topic'.",
            ),
        ],
        responses={200: SectionTrendSerializer(many=True), **_TREND_ERRORS},
    ),
)
class SectionTrendView(APIView):
    """GET /api/v1/analytics/trends/sections/?exam_id=<uuid>&scope=subject|topic."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        exam_id = _resolve_exam_id(request)
        scope = request.query_params.get("scope", "subject")
        if scope not in ("subject", "topic"):
            raise ValidationError({"scope": "Must be 'subject' or 'topic'."})

        data = get_section_trend(
            user_id=request.user.id, exam_id=exam_id, scope_type=scope
        )
        return Response(SectionTrendSerializer(data, many=True).data)


@extend_schema_view(
    get=extend_schema(
        summary="Readiness timeline",
        description="Chronological exam-readiness history for the authenticated student (read-only).",
        parameters=[_TREND_EXAM_PARAM],
        responses={200: ReadinessTrendSerializer(many=True), **_TREND_ERRORS},
    ),
)
class ReadinessTrendView(APIView):
    """GET /api/v1/analytics/trends/readiness/?exam_id=<uuid> — self-scoped."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        exam_id = _resolve_exam_id(request)
        data = get_readiness_trend(user_id=request.user.id, exam_id=exam_id)
        return Response(ReadinessTrendSerializer(data, many=True).data)

