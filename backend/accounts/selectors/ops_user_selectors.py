"""
Operations User 360 selectors — OPS-BE-01 (reads only).

Pure query builders / readers for the read-only Operations user-management APIs.
No mutations, no business logic. Cross-app analytics reads reuse the existing
analytics selectors (streak, latest readiness) rather than recomputing anything —
"only existing analytics data, no invented calculations".
"""
from uuid import UUID

from django.db.models import Q, QuerySet
from django.shortcuts import get_object_or_404

from accounts.models import User


def list_ops_users(
    *,
    search: str | None = None,
    role: str | None = None,
    status: str | None = None,
    target_exam: UUID | None = None,
) -> QuerySet[User]:
    """
    The operational user list, with optional server-side search and filters.

    - ``search``      → case-insensitive match on full name OR email.
    - ``role``        → exact RBAC role name the user holds.
    - ``status``      → account status (pending/active/suspended/deleted).
    - ``target_exam`` → the user's target exam id.

    Ordering/pagination are applied by the view's pagination class (cursor).
    """
    qs = User.objects.select_related("target_exam").prefetch_related(
        "user_roles__role"
    )
    if search:
        qs = qs.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
    if role:
        qs = qs.filter(user_roles__role__name=role)
    if status:
        qs = qs.filter(status=status)
    if target_exam:
        qs = qs.filter(target_exam_id=target_exam)
    # distinct(): the role join can fan out a user across multiple role rows.
    return qs.distinct()


def get_ops_user(*, user_id: UUID) -> User:
    """A single user for the detail/summary endpoints, or HTTP 404 if missing."""
    return get_object_or_404(
        User.objects.select_related("target_exam").prefetch_related(
            "user_roles__role"
        ),
        id=user_id,
    )


def get_ops_user_summary(*, user: User) -> dict:
    """
    Operational summary for a user from EXISTING analytics/attempt data only.

    Reuses ``analytics`` selectors for streak and latest readiness; readiness is
    scoped to the user's target exam (the only exam context the profile exposes)
    and is ``None`` when unavailable. No metric is computed here.
    """
    # Local imports keep this cross-app dependency out of app-loading order.
    from analytics.selectors.analytics_selectors import (
        get_latest_readiness,
        get_user_streak,
    )
    from attempts.models import ExamAttempt

    attempts = ExamAttempt.objects.filter(user=user)
    latest_attempt = (
        attempts.select_related("exam").order_by("-created_at").first()
    )

    readiness_score = None
    if user.target_exam_id:
        readiness = get_latest_readiness(
            user_id=user.id, exam_id=user.target_exam_id
        )
        if readiness is not None:
            readiness_score = readiness.score

    return {
        "total_attempts": attempts.count(),
        "latest_attempt": latest_attempt,
        "readiness_score": readiness_score,
        "current_streak": get_user_streak(user_id=user.id),
    }
