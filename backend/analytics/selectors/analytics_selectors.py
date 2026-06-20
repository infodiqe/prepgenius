import datetime
import logging
from collections import OrderedDict
from decimal import Decimal
from uuid import UUID

from zoneinfo import ZoneInfo
from django.core.cache import cache
from django.db.models import Avg, Count, Max, Q, Sum
from django.utils import timezone

from analytics.models import (
    AttemptSectionAnalytics,
    ExamReadinessScore,
    UserTopicPerformance,
    WeakTopic,
)
from attempts.models import ExamAttempt, UserAnswer
from exams.models import Subject, Topic

logger = logging.getLogger(__name__)


def get_attempt_results(*, attempt_id: UUID) -> dict:
    """Returns the scored result metadata and pass/fail status for a given attempt."""
    try:
        attempt = ExamAttempt.objects.select_related("exam").get(id=attempt_id)
    except ExamAttempt.DoesNotExist:
        raise ValueError(f"ExamAttempt not found: {attempt_id}")

    if attempt.status != "scored":
        raise ValueError(f"Attempt is not scored: {attempt_id}")

    from analytics.services.section_analytics import check_pass_line

    passing_criteria = attempt.exam.passing_criteria or {}
    accuracy = attempt.accuracy or Decimal("0.00")
    is_passed = check_pass_line(accuracy=accuracy, passing_criteria=passing_criteria)

    return {
        "attempt_id": attempt.id,
        "score": attempt.score,
        "max_score": attempt.max_score,
        "correct": attempt.correct,
        "incorrect": attempt.incorrect,
        "skipped": attempt.skipped,
        "accuracy": attempt.accuracy,
        "time_taken_seconds": attempt.time_taken_seconds,
        "status": attempt.status,
        "submitted_at": attempt.submitted_at,
        "pass_status": "pass" if is_passed else "needs-work",
    }


def get_attempt_analytics(*, attempt_id: UUID) -> dict:
    """Returns detailed subject and topic level analytics for a single attempt."""
    analytics_records = list(AttemptSectionAnalytics.objects.filter(attempt_id=attempt_id))

    subject_ids = [r.scope_id for r in analytics_records if r.scope_type == "subject"]
    topic_ids = [r.scope_id for r in analytics_records if r.scope_type == "topic"]

    # Bulk lookups to prevent N+1 queries
    subjects = {s.id: s.name for s in Subject.objects.filter(id__in=subject_ids)}
    topics = {t.id: t.name for t in Topic.objects.filter(id__in=topic_ids)}

    subjects_breakdown = []
    topics_breakdown = []

    for r in analytics_records:
        item = {
            "id": r.id,
            "scope_id": r.scope_id,
            "total": r.total,
            "correct": r.correct,
            "accuracy": r.accuracy,
            "avg_time": r.avg_time,
        }
        if r.scope_type == "subject":
            item["name"] = subjects.get(r.scope_id, "Unknown Subject")
            subjects_breakdown.append(item)
        elif r.scope_type == "topic":
            item["name"] = topics.get(r.scope_id, "Unknown Topic")
            topics_breakdown.append(item)

    return {
        "attempt_id": attempt_id,
        "subjects": subjects_breakdown,
        "topics": topics_breakdown,
    }


def get_user_topic_performance(*, user_id: UUID, exam_id: UUID) -> list[dict]:
    """Returns all UserTopicPerformance records for a user and an exam, with topic names."""
    performances = UserTopicPerformance.objects.filter(
        user_id=user_id, exam_id=exam_id
    ).select_related("topic")

    results = []
    for p in performances:
        results.append({
            "id": p.id,
            "topic_id": p.topic_id,
            "topic_name": p.topic.name,
            "attempts": p.attempts,
            "correct": p.correct,
            "success_rate": p.success_rate,
            "avg_time": p.avg_time,
            "last_practiced_at": p.last_practiced_at,
        })
    return results


# Window caps keep trend payloads bounded (T24).
SECTION_TREND_WINDOW = 20
READINESS_TREND_WINDOW = 50


def get_attempt_trend(*, user_id: UUID, exam_id: UUID) -> list[dict]:
    """Chronological scored-attempt history for a user+exam (T24)."""
    attempts = (
        ExamAttempt.objects.filter(
            user_id=user_id, exam_id=exam_id, status="scored"
        )
        .only("id", "created_at", "score", "max_score", "accuracy")
        .order_by("created_at")
    )
    return [
        {
            "attempt_id": a.id,
            "created_at": a.created_at,
            "score": a.score,
            "max_score": a.max_score,
            "accuracy": a.accuracy,
        }
        for a in attempts
    ]


def get_section_trend(
    *,
    user_id: UUID,
    exam_id: UUID,
    scope_type: str,
    window: int = SECTION_TREND_WINDOW,
) -> list[dict]:
    """Per-section accuracy history grouped by scope (T24).

    Derived from AttemptSectionAnalytics joined to the owning attempt's
    timestamp. Bounded to the most recent `window` scored attempts. No N+1:
    one query for the recent attempt ids, one joined query (select_related the
    attempt) for the section rows, and one bulk name lookup.
    """
    recent_ids = list(
        ExamAttempt.objects.filter(
            user_id=user_id, exam_id=exam_id, status="scored"
        )
        .order_by("-created_at")
        .values_list("id", flat=True)[:window]
    )
    if not recent_ids:
        return []

    rows = (
        AttemptSectionAnalytics.objects.filter(
            attempt_id__in=recent_ids, scope_type=scope_type
        )
        .select_related("attempt")
        .order_by("attempt__created_at")
    )

    scope_ids = {r.scope_id for r in rows}
    if scope_type == "subject":
        names = {s.id: s.name for s in Subject.objects.filter(id__in=scope_ids)}
    else:
        names = {t.id: t.name for t in Topic.objects.filter(id__in=scope_ids)}

    grouped: "OrderedDict[UUID, dict]" = OrderedDict()
    for r in rows:
        group = grouped.get(r.scope_id)
        if group is None:
            group = {
                "scope_id": r.scope_id,
                "scope_name": names.get(r.scope_id, "Unknown"),
                "history": [],
            }
            grouped[r.scope_id] = group
        group["history"].append(
            {
                "attempt_id": r.attempt_id,
                "created_at": r.attempt.created_at,
                "accuracy": r.accuracy,
            }
        )
    return list(grouped.values())


def get_readiness_trend(
    *, user_id: UUID, exam_id: UUID, window: int = READINESS_TREND_WINDOW
) -> list[dict]:
    """Chronological readiness timeline for a user+exam (T24), most recent
    `window` rows, returned oldest → newest."""
    rows = list(
        ExamReadinessScore.objects.filter(user_id=user_id, exam_id=exam_id)
        .order_by("-computed_at")[:window]
    )
    rows.reverse()
    return [
        {
            "score": r.score,
            "band": (r.components or {}).get("band"),
            "computed_at": r.computed_at,
            "components": r.components or {},
        }
        for r in rows
    ]


def get_latest_readiness(*, user_id: UUID, exam_id: UUID) -> ExamReadinessScore | None:
    """Returns the most recent ExamReadinessScore for a user+exam, or None."""
    return (
        ExamReadinessScore.objects.filter(user_id=user_id, exam_id=exam_id)
        .order_by("-computed_at")
        .first()
    )


def get_active_weak_topics(*, user_id: UUID, exam_id: UUID) -> list[dict]:
    """Returns all active weak topics for a user and an exam."""
    weak_topics = WeakTopic.objects.filter(
        user_id=user_id, exam_id=exam_id, status="active"
    ).select_related("topic")

    results = []
    for w in weak_topics:
        results.append({
            "id": w.id,
            "topic_id": w.topic_id,
            "topic_name": w.topic.name,
            "accuracy": w.accuracy,
            "severity": w.severity,
            "status": w.status,
            "detected_at": w.detected_at,
        })
    return results


def get_user_streak(*, user_id: UUID) -> int:
    """Returns the current consecutive daily practice streak for a user.

    Uses Redis cache with a graceful database fallback.
    """
    cache_key = f"user_streak:{str(user_id)}"
    try:
        cached_streak = cache.get(cache_key)
        if cached_streak is not None:
            return int(cached_streak)
    except Exception as e:
        logger.warning(f"Cache error in get_user_streak for user {user_id}: {e}")

    # Fallback: calculate from DB
    from django.db.models.functions import TruncDate

    dates = list(
        ExamAttempt.objects.filter(user_id=user_id)
        .annotate(date=TruncDate("created_at"))
        .values_list("date", flat=True)
        .distinct()
        .order_by("-date")
    )

    if not dates:
        streak = 0
    else:
        tz = ZoneInfo("Asia/Kolkata")
        today = timezone.now().astimezone(tz).date()
        yesterday = today - datetime.timedelta(days=1)

        if dates[0] == today:
            streak = 0
            expected = today
            for d in dates:
                if d == expected:
                    streak += 1
                    expected -= datetime.timedelta(days=1)
                elif d < expected:
                    break
        elif dates[0] == yesterday:
            streak = 0
            expected = yesterday
            for d in dates:
                if d == expected:
                    streak += 1
                    expected -= datetime.timedelta(days=1)
                elif d < expected:
                    break
        else:
            streak = 0

    try:
        cache.set(cache_key, streak, timeout=3600)  # cache for 1 hour
    except Exception as e:
        logger.warning(f"Failed to set cache in get_user_streak for user {user_id}: {e}")

    return streak


def get_daily_questions_attempted(*, user_id: UUID) -> int:
    """Returns the total number of questions answered by the user today (Asia/Kolkata timezone)."""
    tz = ZoneInfo("Asia/Kolkata")
    start_of_day = timezone.now().astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + datetime.timedelta(days=1)

    return UserAnswer.objects.filter(
        attempt__user_id=user_id,
        state__in=["answered", "answered_marked"],
        created_at__gte=start_of_day,
        created_at__lt=end_of_day,
    ).count()


def get_dashboard_summary(*, user_id: UUID, exam_id: UUID) -> dict:
    """Aggregates and returns dashboard statistics for a user and an exam."""
    streak = get_user_streak(user_id=user_id)
    daily_attempted = get_daily_questions_attempted(user_id=user_id)
    daily_target = 10  # default daily questions target

    attempts = ExamAttempt.objects.filter(
        user_id=user_id, exam_id=exam_id, status="scored"
    )

    metrics = attempts.aggregate(
        total_correct=Sum("correct"),
        total_incorrect=Sum("incorrect")
    )
    correct = metrics["total_correct"] or 0
    incorrect = metrics["total_incorrect"] or 0
    total_answered = correct + incorrect
    overall_accuracy = (
        Decimal(str(round((correct / total_answered) * 100, 2)))
        if total_answered > 0
        else Decimal("0.00")
    )

    recent = list(attempts.order_by("-created_at")[:5])
    recent_list = [
        {
            "id": att.id,
            "attempt_type": att.attempt_type,
            "score": att.score,
            "max_score": att.max_score,
            "correct": att.correct,
            "incorrect": att.incorrect,
            "accuracy": att.accuracy,
            "created_at": att.created_at,
        }
        for att in recent
    ]

    return {
        "streak": streak,
        "daily_questions_attempted": daily_attempted,
        "daily_target": daily_target,
        "overall_accuracy": overall_accuracy,
        "recent_activity": recent_list,
    }


def get_weak_topic_recommendations(*, user_id: UUID, exam_id: UUID) -> list[dict]:
    """Generates mock-remediation recommendations based on the user's active weak topics.

    Returns a list of recommendations, sorted by severity (highest first) and accuracy (lowest first).
    """
    weak_topics = WeakTopic.objects.filter(
        user_id=user_id, exam_id=exam_id, status="active"
    ).select_related("topic__subject")

    weak_topics = weak_topics.order_by("-severity", "accuracy")

    recommendations = []
    for wt in weak_topics:
        recommendations.append({
            "topic_id": wt.topic_id,
            "topic_name": wt.topic.name,
            "subject_name": wt.topic.subject.name,
            "accuracy": wt.accuracy,
            "severity": wt.severity,
            "recommended_action": f"Practice {wt.topic.name} to improve your accuracy.",
        })

    return recommendations
