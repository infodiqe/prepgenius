"""
Operations analytics selectors — OPS-BE-03 (reads only).

Pure, read-only query builders for the operator-wide analytics APIs. No
mutations, no business logic, no raw SQL — only ORM aggregation over EXISTING
tables. Each function answers one question; the services layer composes them into
endpoint payloads.

These are platform-wide (operator) aggregates and are deliberately separate from
the learner-scoped analytics selectors (`analytics_selectors.py`), which are NOT
modified.
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models import (
    Count,
    DecimalField,
    F,
    OuterRef,
    Q,
    Subquery,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounts.models import User
from analytics.models import ExamReadinessScore
from attempts.models import ExamAttempt
from cms.models import CMSPage
from cms.models.page import STATUS_PUBLISHED
from content_review.models import ContentReview
from credits.models import CreditBalance, CreditLedger
from questions.models import Question

# Default activity window for "active users" (DAU/MAU-style, §4.8).
ACTIVE_WINDOW_DAYS = 30

# Review-state vocabulary (mirrors Question.review_status choices).
_QUESTION_STATUSES = ("draft", "in_review", "sme_review", "approved", "published")

# Readiness bands. Boundaries are contiguous and inclusive-upper so decimal
# scores never fall through a gap; the final band is open-topped so any score
# above 80 is captured. Order is preserved for the distribution payload.
READINESS_BANDS: tuple[tuple[str, Q], ...] = (
    ("0-20", Q(score__lte=20)),
    ("21-40", Q(score__gt=20, score__lte=40)),
    ("41-60", Q(score__gt=40, score__lte=60)),
    ("61-80", Q(score__gt=60, score__lte=80)),
    ("81-100", Q(score__gt=80)),
)

_MONEY = DecimalField(max_digits=14, decimal_places=2)


def _coalesce_sum(field: str):
    """SUM(field) that returns Decimal('0') instead of NULL on an empty set."""
    return Coalesce(Sum(field), Value(Decimal("0")), output_field=_MONEY)


# ── User / activity ──────────────────────────────────────────────────────────


def count_total_users() -> int:
    return User.objects.count()


def count_active_users(*, days: int = ACTIVE_WINDOW_DAYS) -> int:
    """Distinct users with at least one attempt in the trailing ``days`` window.

    Activity is sourced from the existing attempts table (a guaranteed real
    activity signal) rather than ``last_login`` (which depends on the auth flow).
    """
    cutoff = timezone.now() - timedelta(days=days)
    return (
        ExamAttempt.objects.filter(created_at__gte=cutoff)
        .values("user_id")
        .distinct()
        .count()
    )


def count_total_attempts() -> int:
    return ExamAttempt.objects.count()


# ── Content / questions ──────────────────────────────────────────────────────


def count_total_questions() -> int:
    return Question.objects.count()


def count_questions_by_status() -> dict[str, int]:
    """One row per review state — single aggregate query (serves API 1 & API 3)."""
    return Question.objects.aggregate(
        **{
            status: Count("id", filter=Q(review_status=status))
            for status in _QUESTION_STATUSES
        }
    )


def count_published_pages() -> int:
    return CMSPage.objects.filter(status=STATUS_PUBLISHED).count()


# ── Review operations ────────────────────────────────────────────────────────


def review_ops_counts() -> dict[str, int]:
    """Claim/escalation state of the live review pool + today's decisions.

    - claimed / unclaimed → scoped to the active ``in_review`` pool by claim state.
    - escalated           → questions currently in ``sme_review``.
    - approved/rejected_today → today's transition events from the immutable
      ``content_reviews`` log (today is resolved in the active timezone).
    """
    in_review = Question.objects.filter(review_status="in_review").aggregate(
        claimed=Count("id", filter=Q(claimed_by__isnull=False)),
        unclaimed=Count("id", filter=Q(claimed_by__isnull=True)),
    )
    escalated = Question.objects.filter(review_status="sme_review").count()

    today = timezone.localdate()
    approved_today = ContentReview.objects.filter(
        action="approve", created_at__date=today
    ).count()
    rejected_today = ContentReview.objects.filter(
        action="reject", created_at__date=today
    ).count()

    return {
        "claimed": in_review["claimed"],
        "unclaimed": in_review["unclaimed"],
        "escalated": escalated,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
    }


# ── Readiness distribution ───────────────────────────────────────────────────


def readiness_distribution() -> list[dict]:
    """Banded distribution of the LATEST readiness score per (user, exam).

    A correlated subquery resolves each (user, exam) pair's most recent score id;
    keeping only those rows yields one current score per learner-exam, which the
    bands then count via conditional aggregation. Portable across backends (no
    DISTINCT ON). Returns an ordered list of ``{"label", "count"}`` matching
    READINESS_BANDS.
    """
    latest_id = (
        ExamReadinessScore.objects.filter(
            user_id=OuterRef("user_id"), exam_id=OuterRef("exam_id")
        )
        .order_by("-computed_at")
        .values("id")[:1]
    )
    latest = ExamReadinessScore.objects.annotate(
        latest_id=Subquery(latest_id)
    ).filter(id=F("latest_id"))
    aggregates = latest.aggregate(
        **{f"band_{i}": Count("id", filter=q) for i, (_, q) in enumerate(READINESS_BANDS)}
    )
    return [
        {"label": label, "count": aggregates[f"band_{i}"]}
        for i, (label, _) in enumerate(READINESS_BANDS)
    ]


# ── Credits ──────────────────────────────────────────────────────────────────


def sum_credit_balances() -> dict[str, Decimal]:
    """Platform-wide available + reserved balances (sum across all wallets)."""
    return CreditBalance.objects.aggregate(
        available=_coalesce_sum("available_credits"),
        reserved=_coalesce_sum("reserved_credits"),
    )


def credit_ledger_totals() -> dict[str, Decimal]:
    """Cumulative granted / reserved / debited magnitudes from the append-only ledger.

    Reservation and debit amounts are stored NEGATIVE (sign convention in the
    credits services); they are reported here as positive magnitudes via ``abs``.
    """
    granted = CreditLedger.objects.filter(
        transaction_type=CreditLedger.GRANT
    ).aggregate(total=_coalesce_sum("amount"))["total"]
    reserved = CreditLedger.objects.filter(
        transaction_type=CreditLedger.RESERVATION
    ).aggregate(total=_coalesce_sum("amount"))["total"]
    debited = CreditLedger.objects.filter(
        transaction_type=CreditLedger.DEBIT
    ).aggregate(total=_coalesce_sum("amount"))["total"]
    return {
        "total_granted": granted,
        "total_reserved": abs(reserved),
        "total_debited": abs(debited),
    }


def count_active_wallets() -> int:
    """Wallets with a positive spendable (available) balance."""
    return CreditBalance.objects.filter(available_credits__gt=0).count()
