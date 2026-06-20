"""Exam Readiness Engine — T22.

Computes ExamReadinessScore from existing analytics data only (no new models, no
scoring changes). Formula (approved weights, config-overridable per exam via
`exam.analytics_rules.readiness_score_weights`):

    mock_performance 50 · subject_accuracy 25 · topic_accuracy 15
    consistency 5 · practice_completion 5

Guardrails:
  • mock_performance & subject_accuracy use ONLY exam-representative attempts
    (diagnostic / full_mock / previous_year) — never topic/subject/daily practice.
  • Requires ≥1 scored exam-type attempt; otherwise returns None (Provisional).
  • "Exam Ready" band requires: score ≥ threshold AND ≥2 scored exam-type
    attempts AND no active severity-3 weak topic.

All components are 0–100; the final score is clamped to 0–100. The full
breakdown is stored in `components` for transparency. Append-only with a
no-change dedup guard.
"""

import logging
from decimal import Decimal
from uuid import UUID

from django.db import transaction
from django.db.models import Avg

from analytics.models import (
    AttemptSectionAnalytics,
    ExamReadinessScore,
    UserTopicPerformance,
    WeakTopic,
)
from analytics.selectors.analytics_selectors import get_user_streak
from attempts.models import ExamAttempt
from exams.models import Exam, Topic

logger = logging.getLogger(__name__)

# "diagnostic" is included for forward-compatibility; today the diagnostic is a
# full_mock attempt (SPR1-HOTFIX-02), so the live set is {full_mock, previous_year}.
EXAM_ATTEMPT_TYPES = ("diagnostic", "full_mock", "previous_year")

# Approved T22 weights (code default; overridable per-exam via analytics_rules).
DEFAULT_WEIGHTS = {
    "mock_performance": 50,
    "subject_accuracy": 25,
    "topic_accuracy": 15,
    "consistency": 5,
    "practice_completion": 5,
}
COMPONENT_KEYS = tuple(DEFAULT_WEIGHTS.keys())

DEFAULT_DEVELOPING_FLOOR = 40
DEFAULT_ON_TRACK_FLOOR = 60
DEFAULT_EXAM_READY_THRESHOLD = 80
MIN_EXAM_ATTEMPTS_FOR_READY = 2
CONSISTENCY_TARGET_DAYS = 7


def _f(value) -> float:
    return float(value) if value is not None else 0.0


def _resolve_weights(exam: Exam) -> dict:
    """Per-exam weights from config, falling back to the approved defaults."""
    raw = (exam.analytics_rules or {}).get("readiness_score_weights")
    if isinstance(raw, dict):
        weights = {k: _f(raw.get(k, 0)) for k in COMPONENT_KEYS}
        if sum(weights.values()) > 0:
            return weights
    return dict(DEFAULT_WEIGHTS)


def _band_thresholds(exam: Exam) -> tuple[float, float, float]:
    rules = exam.analytics_rules or {}
    bands = rules.get("readiness_bands")
    bands = bands if isinstance(bands, dict) else {}
    passing = (exam.passing_criteria or {}).get("general") or {}
    developing = _f(bands.get("developing", DEFAULT_DEVELOPING_FLOOR))
    on_track = _f(
        bands.get("on_track", passing.get("required_percentage", DEFAULT_ON_TRACK_FLOOR))
    )
    exam_ready = _f(bands.get("exam_ready", DEFAULT_EXAM_READY_THRESHOLD))
    return developing, on_track, exam_ready


def compute_exam_readiness(
    *, user_id: UUID, exam_id: UUID, persist: bool = True
) -> ExamReadinessScore | None:
    """Compute (and by default persist) a readiness score.

    Returns the ExamReadinessScore row, or None when the user has no scored
    exam-type attempt yet (Provisional — nothing is written).
    """
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        return None

    exam_attempts = ExamAttempt.objects.filter(
        user_id=user_id,
        exam_id=exam_id,
        status="scored",
        attempt_type__in=EXAM_ATTEMPT_TYPES,
    )
    exam_attempt_count = exam_attempts.count()
    if exam_attempt_count < 1:
        return None  # Provisional — insufficient data.

    attempt_ids = list(exam_attempts.values_list("id", flat=True))

    # ── Components (0–100) ────────────────────────────────────────────────────
    # Guardrailed: mock + subject derive ONLY from exam-type attempts.
    mock_performance = _f(exam_attempts.aggregate(v=Avg("accuracy"))["v"])
    subject_accuracy = _f(
        AttemptSectionAnalytics.objects.filter(
            attempt_id__in=attempt_ids, scope_type="subject"
        ).aggregate(v=Avg("accuracy"))["v"]
    )

    topic_qs = UserTopicPerformance.objects.filter(
        user_id=user_id, exam_id=exam_id, attempts__gt=0
    )
    topic_accuracy = _f(topic_qs.aggregate(v=Avg("success_rate"))["v"])

    streak = get_user_streak(user_id=user_id)
    consistency = (
        min(streak, CONSISTENCY_TARGET_DAYS) / CONSISTENCY_TARGET_DAYS * 100
        if CONSISTENCY_TARGET_DAYS
        else 0.0
    )

    total_topics = Topic.objects.filter(subject__exam_id=exam_id).count()
    topics_practised = topic_qs.count()
    practice_completion = (
        min(topics_practised / total_topics * 100, 100.0) if total_topics else 0.0
    )

    components_raw = {
        "mock_performance": mock_performance,
        "subject_accuracy": subject_accuracy,
        "topic_accuracy": topic_accuracy,
        "consistency": consistency,
        "practice_completion": practice_completion,
    }

    # ── Weighted score ────────────────────────────────────────────────────────
    weights = _resolve_weights(exam)
    weight_sum = sum(weights.values()) or 1.0
    raw_score = sum(weights[k] * components_raw[k] for k in COMPONENT_KEYS) / weight_sum
    score = max(0.0, min(100.0, raw_score))
    score_dec = Decimal(str(round(score, 2)))

    # ── Band (Exam Ready is gated) ────────────────────────────────────────────
    has_active_sev3 = WeakTopic.objects.filter(
        user_id=user_id, exam_id=exam_id, status="active", severity__gte=3
    ).exists()
    developing_floor, on_track_floor, exam_ready_threshold = _band_thresholds(exam)

    if (
        score >= exam_ready_threshold
        and exam_attempt_count >= MIN_EXAM_ATTEMPTS_FOR_READY
        and not has_active_sev3
    ):
        band = "exam_ready"
    elif score >= on_track_floor:
        band = "on_track"
    elif score >= developing_floor:
        band = "developing"
    else:
        band = "needs_improvement"

    components = {
        "status": "scored",
        "band": band,
        "weights": weights,
        "scores": {k: round(v, 2) for k, v in components_raw.items()},
        "exam_type_attempts": exam_attempt_count,
        "has_active_severity_3_weak_topic": has_active_sev3,
        "exam_ready_threshold": exam_ready_threshold,
        "topics_practised": topics_practised,
        "topics_total": total_topics,
        "streak_days": streak,
    }

    if not persist:
        return ExamReadinessScore(
            user_id=user_id, exam_id=exam_id, score=score_dec, components=components
        )

    # Append-only with a no-change dedup guard.
    with transaction.atomic():
        latest = (
            ExamReadinessScore.objects.filter(user_id=user_id, exam_id=exam_id)
            .order_by("-computed_at")
            .first()
        )
        if (
            latest is not None
            and latest.score == score_dec
            and (latest.components or {}).get("band") == band
        ):
            return latest
        return ExamReadinessScore.objects.create(
            user_id=user_id, exam_id=exam_id, score=score_dec, components=components
        )
