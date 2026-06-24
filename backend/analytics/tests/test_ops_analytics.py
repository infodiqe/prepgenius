"""
OPS-BE-03 — operator analytics API tests.

Covers selectors (exact aggregates over a controlled dataset), serializers
(output shape), the five API endpoints, and RBAC (reuse of IsOpsUserViewer:
operational roles allowed, students forbidden, anonymous unauthenticated).
"""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from accounts.models import User
from accounts.tests.factories import UserFactory
from analytics.api.ops_serializers import (
    OpsContentDistributionSerializer,
    OpsCreditAnalyticsSerializer,
    OpsOverviewSerializer,
    OpsReadinessDistributionSerializer,
    OpsReviewAnalyticsSerializer,
)
from analytics.models import ExamReadinessScore
from analytics.selectors import ops_analytics_selectors as sel
from analytics.services import ops_analytics_services as svc
from attempts.models import ExamAttempt
from cms.models import CMSPage
from content_review.models import ContentReview
from credits.models import CreditBalance, CreditLedger
from questions.models import Question

pytestmark = pytest.mark.django_db

OPS_ENDPOINTS = [
    "ops-analytics-overview",
    "ops-analytics-readiness",
    "ops-analytics-content",
    "ops-analytics-review",
    "ops-analytics-credits",
]


def _question(exam, subtopic, review_status, *, claimed_by=None):
    return Question.objects.create(
        exam=exam,
        subtopic=subtopic,
        stem=f"Q {review_status} {claimed_by}",
        review_status=review_status,
        claimed_by=claimed_by,
    )


def _readiness(user, exam, score, *, computed_offset_days=0):
    row = ExamReadinessScore.objects.create(user=user, exam=exam, score=Decimal(score))
    if computed_offset_days:
        ExamReadinessScore.objects.filter(id=row.id).update(
            computed_at=timezone.now() - timedelta(days=computed_offset_days)
        )
    return row


@pytest.fixture
def seeded(exam_hierarchy):
    """A fully-controlled operator dataset; returns the exam hierarchy used."""
    exam = exam_hierarchy["exam"]
    subtopic = exam_hierarchy["subtopic"]
    reviewer = UserFactory(status="active")

    # ── Questions by review state ───────────────────────────────────────────
    _question(exam, subtopic, "draft")
    _question(exam, subtopic, "in_review", claimed_by=reviewer)  # claimed
    _question(exam, subtopic, "in_review")  # unclaimed
    _question(exam, subtopic, "sme_review")  # escalated
    approved_q = _question(exam, subtopic, "approved")
    _question(exam, subtopic, "published")
    _question(exam, subtopic, "rejected")

    # ── Attempts → active users (3 in-window distinct users, 1 stale) ───────
    for _ in range(3):
        ExamAttempt.objects.create(
            user=UserFactory(status="active"), exam=exam, attempt_type="full_mock"
        )
    stale = ExamAttempt.objects.create(
        user=UserFactory(status="active"), exam=exam, attempt_type="full_mock"
    )
    ExamAttempt.objects.filter(id=stale.id).update(
        created_at=timezone.now() - timedelta(days=40)
    )

    # ── Readiness: one per band; one (user,exam) with an older + newer score ─
    _readiness(UserFactory(status="active"), exam, "10")  # 0-20
    _readiness(UserFactory(status="active"), exam, "30")  # 21-40
    _readiness(UserFactory(status="active"), exam, "50")  # 41-60
    _readiness(UserFactory(status="active"), exam, "70")  # 61-80
    _readiness(UserFactory(status="active"), exam, "95")  # 81-100
    multi = UserFactory(status="active")
    _readiness(multi, exam, "15", computed_offset_days=5)  # older → ignored
    _readiness(multi, exam, "85")  # latest → 81-100

    # ── CMS pages (2 published, 1 draft) ────────────────────────────────────
    for i in range(2):
        CMSPage.objects.create(slug=f"pub-{i}", title=f"Pub {i}", status="published")
    CMSPage.objects.create(slug="draft-1", title="Draft", status="draft")

    # ── Credits: balances + ledger ──────────────────────────────────────────
    CreditBalance.objects.create(
        user=UserFactory(status="active"),
        available_credits=Decimal("100.00"),
        reserved_credits=Decimal("20.00"),
        lifetime_credits=Decimal("100.00"),
    )
    CreditBalance.objects.create(
        user=UserFactory(status="active"),
        available_credits=Decimal("0.00"),
        reserved_credits=Decimal("0.00"),
        lifetime_credits=Decimal("50.00"),
    )
    payer = UserFactory(status="active")
    CreditLedger.objects.create(
        user=payer, transaction_type=CreditLedger.GRANT,
        amount=Decimal("100.00"), balance_after=Decimal("100.00"),
    )
    CreditLedger.objects.create(
        user=payer, transaction_type=CreditLedger.RESERVATION,
        amount=Decimal("-30.00"), balance_after=Decimal("70.00"),
    )
    CreditLedger.objects.create(
        user=payer, transaction_type=CreditLedger.DEBIT,
        amount=Decimal("-25.00"), balance_after=Decimal("75.00"),
    )

    # ── Content reviews: 2 approve + 1 reject today, 1 approve yesterday ─────
    ContentReview.objects.create(question=approved_q, action="approve")
    ContentReview.objects.create(question=approved_q, action="approve")
    ContentReview.objects.create(question=approved_q, action="reject")
    old = ContentReview.objects.create(question=approved_q, action="approve")
    ContentReview.objects.filter(id=old.id).update(
        created_at=timezone.now() - timedelta(days=1)
    )

    return exam_hierarchy


# ═══════════════════════════════════════════════════════════════════════════
# Selectors (exact aggregates)
# ═══════════════════════════════════════════════════════════════════════════
class TestSelectors:
    def test_overview_counts(self, seeded):
        assert sel.count_total_users() == User.objects.count()
        assert sel.count_active_users() == 3  # stale attempt excluded
        assert sel.count_total_attempts() == 4
        assert sel.count_total_questions() == 7
        assert sel.count_published_pages() == 2

    def test_questions_by_status(self, seeded):
        counts = sel.count_questions_by_status()
        assert counts == {
            "draft": 1,
            "in_review": 2,
            "sme_review": 1,
            "approved": 1,
            "published": 1,
        }

    def test_review_ops_counts(self, seeded):
        counts = sel.review_ops_counts()
        assert counts == {
            "claimed": 1,
            "unclaimed": 1,
            "escalated": 1,
            "approved_today": 2,
            "rejected_today": 1,
        }

    def test_readiness_distribution_uses_latest_per_user_exam(self, seeded):
        bands = {b["label"]: b["count"] for b in sel.readiness_distribution()}
        assert bands == {
            "0-20": 1,
            "21-40": 1,
            "41-60": 1,
            "61-80": 1,
            "81-100": 2,  # the 95 score + the multi-score user's latest (85)
        }

    def test_credit_balance_sums(self, seeded):
        sums = sel.sum_credit_balances()
        assert sums["available"] == Decimal("100.00")
        assert sums["reserved"] == Decimal("20.00")

    def test_credit_ledger_totals_report_positive_magnitudes(self, seeded):
        totals = sel.credit_ledger_totals()
        assert totals["total_granted"] == Decimal("100.00")
        assert totals["total_reserved"] == Decimal("30.00")
        assert totals["total_debited"] == Decimal("25.00")

    def test_active_wallets_counts_positive_balances(self, seeded):
        assert sel.count_active_wallets() == 1

    def test_empty_database_yields_zeroes(self):
        # No seed: exercises the Coalesce/abs(0) and empty-aggregate branches.
        assert sel.count_active_users() == 0
        assert sel.sum_credit_balances() == {
            "available": Decimal("0"),
            "reserved": Decimal("0"),
        }
        assert sel.credit_ledger_totals() == {
            "total_granted": Decimal("0"),
            "total_reserved": Decimal("0"),
            "total_debited": Decimal("0"),
        }
        assert sel.readiness_distribution()[0] == {"label": "0-20", "count": 0}


# ═══════════════════════════════════════════════════════════════════════════
# Services (composition)
# ═══════════════════════════════════════════════════════════════════════════
class TestServices:
    def test_overview_payload(self, seeded):
        data = svc.get_ops_overview()
        assert data["approved_questions"] == 1
        assert data["available_credits"] == Decimal("100.00")
        assert data["reserved_credits"] == Decimal("20.00")
        assert set(data) == {
            "total_users", "active_users_30d", "total_attempts",
            "total_questions", "approved_questions", "published_pages",
            "available_credits", "reserved_credits",
        }

    def test_readiness_payload_has_total(self, seeded):
        data = svc.get_ops_readiness_distribution()
        assert data["total"] == 6
        assert len(data["bands"]) == 5

    def test_credit_payload_includes_active_wallets(self, seeded):
        data = svc.get_ops_credit_analytics()
        assert data["active_wallets"] == 1
        assert data["total_granted"] == Decimal("100.00")


# ═══════════════════════════════════════════════════════════════════════════
# Serializers (output shape)
# ═══════════════════════════════════════════════════════════════════════════
class TestSerializers:
    def test_overview_serializer_shape(self, seeded):
        data = OpsOverviewSerializer(svc.get_ops_overview()).data
        assert data["available_credits"] == "100.00"  # NUMERIC, never float
        assert isinstance(data["total_users"], int)

    def test_readiness_serializer_shape(self, seeded):
        data = OpsReadinessDistributionSerializer(
            svc.get_ops_readiness_distribution()
        ).data
        assert data["total"] == 6
        assert data["bands"][4] == {"label": "81-100", "count": 2}

    def test_content_serializer_shape(self, seeded):
        data = OpsContentDistributionSerializer(
            svc.get_ops_content_distribution()
        ).data
        assert data == {
            "draft": 1, "in_review": 2, "sme_review": 1,
            "approved": 1, "published": 1,
        }

    def test_review_serializer_shape(self, seeded):
        data = OpsReviewAnalyticsSerializer(svc.get_ops_review_analytics()).data
        assert data["approved_today"] == 2 and data["rejected_today"] == 1

    def test_credit_serializer_shape(self, seeded):
        data = OpsCreditAnalyticsSerializer(svc.get_ops_credit_analytics()).data
        assert data["total_reserved"] == "30.00"
        assert data["active_wallets"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# API (200 + payload)
# ═══════════════════════════════════════════════════════════════════════════
class TestApi:
    def test_overview_endpoint(self, platform_admin_api_client, seeded):
        res = platform_admin_api_client.get(reverse("ops-analytics-overview"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["total_questions"] == 7
        assert res.data["published_pages"] == 2

    def test_readiness_endpoint(self, platform_admin_api_client, seeded):
        res = platform_admin_api_client.get(reverse("ops-analytics-readiness"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["total"] == 6

    def test_content_endpoint(self, platform_admin_api_client, seeded):
        res = platform_admin_api_client.get(reverse("ops-analytics-content"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["in_review"] == 2

    def test_review_endpoint(self, platform_admin_api_client, seeded):
        res = platform_admin_api_client.get(reverse("ops-analytics-review"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["claimed"] == 1 and res.data["escalated"] == 1

    def test_credits_endpoint(self, platform_admin_api_client, seeded):
        res = platform_admin_api_client.get(reverse("ops-analytics-credits"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["total_debited"] == "25.00"
        assert res.data["active_wallets"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# Permissions (reuse IsOpsUserViewer — no superuser shortcut)
# ═══════════════════════════════════════════════════════════════════════════
class TestPermissions:
    @pytest.mark.parametrize("name", OPS_ENDPOINTS)
    def test_operational_roles_allowed(
        self, content_manager_api_client, name
    ):
        res = content_manager_api_client.get(reverse(name))
        assert res.status_code == status.HTTP_200_OK

    @pytest.mark.parametrize("name", OPS_ENDPOINTS)
    def test_platform_admin_allowed(self, platform_admin_api_client, name):
        res = platform_admin_api_client.get(reverse(name))
        assert res.status_code == status.HTTP_200_OK

    @pytest.mark.parametrize("name", OPS_ENDPOINTS)
    def test_student_forbidden(self, student_api_client, name):
        res = student_api_client.get(reverse(name))
        assert res.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.parametrize("name", OPS_ENDPOINTS)
    def test_anonymous_unauthorized(self, anonymous_client, name):
        res = anonymous_client.get(reverse(name))
        assert res.status_code == status.HTTP_401_UNAUTHORIZED
