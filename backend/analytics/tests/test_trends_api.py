"""Selector + serializer + API tests for the T24 Trend & History endpoints."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from analytics.selectors import (
    get_attempt_trend,
    get_section_trend,
    get_readiness_trend,
)
from analytics.api.serializers import (
    AttemptTrendSerializer,
    SectionTrendSerializer,
    ReadinessTrendSerializer,
)
from analytics.models import ExamReadinessScore
from analytics.tests.factories import (
    AttemptSectionAnalyticsFactory,
    ExamReadinessScoreFactory,
)
from accounts.tests.factories import UserFactory
from attempts.models import ExamAttempt
from attempts.tests.factories import (
    ExamAttemptFactory,
    ExamFactory,
    SubjectFactory,
    TopicFactory,
)

ATTEMPTS_URL = "/api/v1/analytics/trends/attempts/"
SECTIONS_URL = "/api/v1/analytics/trends/sections/"
READINESS_URL = "/api/v1/analytics/trends/readiness/"


def _scored_attempt(user, exam, created_at, *, accuracy="60.00"):
    a = ExamAttemptFactory(
        user=user,
        exam=exam,
        status="scored",
        attempt_type="full_mock",
        accuracy=Decimal(accuracy),
        score=Decimal("30.00"),
        max_score=Decimal("50.00"),
        total_questions=10,
    )
    ExamAttempt.objects.filter(id=a.id).update(created_at=created_at)
    a.refresh_from_db()
    return a


def _readiness(user, exam, computed_at, *, score="50.00", band="developing"):
    r = ExamReadinessScoreFactory(
        user=user,
        exam=exam,
        score=Decimal(score),
        components={"status": "scored", "band": band},
    )
    ExamReadinessScore.objects.filter(id=r.id).update(computed_at=computed_at)
    r.refresh_from_db()
    return r


# ── Selectors ─────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTrendSelectors:
    def test_attempt_trend_is_chronological(self):
        user, exam = UserFactory(), ExamFactory()
        now = timezone.now()
        _scored_attempt(user, exam, now - timedelta(days=2), accuracy="40.00")
        _scored_attempt(user, exam, now - timedelta(days=1), accuracy="70.00")

        trend = get_attempt_trend(user_id=user.id, exam_id=exam.id)
        assert [str(t["accuracy"]) for t in trend] == ["40.00", "70.00"]
        assert trend[0]["created_at"] < trend[1]["created_at"]
        assert set(trend[0]) == {
            "attempt_id",
            "created_at",
            "score",
            "max_score",
            "accuracy",
        }

    def test_attempt_trend_empty(self):
        user, exam = UserFactory(), ExamFactory()
        assert get_attempt_trend(user_id=user.id, exam_id=exam.id) == []

    def test_section_trend_grouped_and_chronological(self):
        user, exam = UserFactory(), ExamFactory()
        subject = SubjectFactory(exam=exam)
        now = timezone.now()
        a1 = _scored_attempt(user, exam, now - timedelta(days=2))
        a2 = _scored_attempt(user, exam, now - timedelta(days=1))
        AttemptSectionAnalyticsFactory(
            attempt=a1, scope_type="subject", scope_id=subject.id, accuracy=55
        )
        AttemptSectionAnalyticsFactory(
            attempt=a2, scope_type="subject", scope_id=subject.id, accuracy=75
        )

        trend = get_section_trend(
            user_id=user.id, exam_id=exam.id, scope_type="subject"
        )
        assert len(trend) == 1
        group = trend[0]
        assert group["scope_id"] == subject.id
        assert group["scope_name"] == subject.name
        assert [str(h["accuracy"]) for h in group["history"]] == ["55.00", "75.00"]
        assert group["history"][0]["created_at"] < group["history"][1]["created_at"]

    def test_section_trend_topic_scope(self):
        user, exam = UserFactory(), ExamFactory()
        topic = TopicFactory(subject=SubjectFactory(exam=exam))
        a = _scored_attempt(user, exam, timezone.now())
        AttemptSectionAnalyticsFactory(
            attempt=a, scope_type="topic", scope_id=topic.id, accuracy=66
        )
        trend = get_section_trend(
            user_id=user.id, exam_id=exam.id, scope_type="topic"
        )
        assert len(trend) == 1
        assert trend[0]["scope_name"] == topic.name

    def test_section_trend_empty(self):
        user, exam = UserFactory(), ExamFactory()
        assert (
            get_section_trend(user_id=user.id, exam_id=exam.id, scope_type="subject")
            == []
        )

    def test_readiness_trend_is_chronological(self):
        user, exam = UserFactory(), ExamFactory()
        now = timezone.now()
        _readiness(user, exam, now - timedelta(days=2), score="40.00", band="developing")
        _readiness(user, exam, now - timedelta(days=1), score="82.00", band="exam_ready")

        trend = get_readiness_trend(user_id=user.id, exam_id=exam.id)
        assert [str(t["score"]) for t in trend] == ["40.00", "82.00"]
        assert [t["band"] for t in trend] == ["developing", "exam_ready"]
        assert trend[0]["computed_at"] < trend[1]["computed_at"]

    def test_readiness_trend_empty(self):
        user, exam = UserFactory(), ExamFactory()
        assert get_readiness_trend(user_id=user.id, exam_id=exam.id) == []


# ── Serializers ─────────────────────────────────────────────────────────────


class TestTrendSerializers:
    def test_attempt_trend_serializer(self):
        data = AttemptTrendSerializer(
            {
                "attempt_id": "11111111-1111-1111-1111-111111111111",
                "created_at": timezone.now(),
                "score": Decimal("30.00"),
                "max_score": Decimal("50.00"),
                "accuracy": Decimal("60.00"),
            }
        ).data
        assert data["accuracy"] == "60.00"
        assert data["max_score"] == "50.00"

    def test_section_trend_serializer_nests_history(self):
        data = SectionTrendSerializer(
            {
                "scope_id": "22222222-2222-2222-2222-222222222222",
                "scope_name": "Science",
                "history": [
                    {
                        "attempt_id": "33333333-3333-3333-3333-333333333333",
                        "created_at": timezone.now(),
                        "accuracy": Decimal("70.00"),
                    }
                ],
            }
        ).data
        assert data["scope_name"] == "Science"
        assert data["history"][0]["accuracy"] == "70.00"

    def test_readiness_trend_serializer(self):
        data = ReadinessTrendSerializer(
            {
                "score": Decimal("82.00"),
                "band": "exam_ready",
                "computed_at": timezone.now(),
                "components": {"band": "exam_ready"},
            }
        ).data
        assert data["score"] == "82.00"
        assert data["band"] == "exam_ready"
        assert data["components"] == {"band": "exam_ready"}


# ── API ─────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTrendsAPI:
    def test_routes_match_spec(self):
        assert reverse("analytics:trends-attempts") == ATTEMPTS_URL
        assert reverse("analytics:trends-sections") == SECTIONS_URL
        assert reverse("analytics:trends-readiness") == READINESS_URL

    def test_attempts_endpoint(self, student_api_client, exam):
        _scored_attempt(student_api_client.user, exam, timezone.now())
        resp = student_api_client.get(f"{ATTEMPTS_URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert "accuracy" in resp.data[0]

    def test_sections_endpoint_defaults_to_subject(self, student_api_client, exam):
        subject = SubjectFactory(exam=exam)
        a = _scored_attempt(student_api_client.user, exam, timezone.now())
        AttemptSectionAnalyticsFactory(
            attempt=a, scope_type="subject", scope_id=subject.id, accuracy=70
        )
        resp = student_api_client.get(f"{SECTIONS_URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]["scope_name"] == subject.name

    def test_sections_invalid_scope_is_400(self, student_api_client, exam):
        resp = student_api_client.get(f"{SECTIONS_URL}?exam_id={exam.id}&scope=bogus")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_readiness_endpoint(self, student_api_client, exam):
        _readiness(student_api_client.user, exam, timezone.now(), band="on_track")
        resp = student_api_client.get(f"{READINESS_URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]["band"] == "on_track"

    def test_empty_states_return_empty_lists(self, student_api_client, exam):
        assert student_api_client.get(f"{ATTEMPTS_URL}?exam_id={exam.id}").data == []
        assert student_api_client.get(f"{SECTIONS_URL}?exam_id={exam.id}").data == []
        assert student_api_client.get(f"{READINESS_URL}?exam_id={exam.id}").data == []

    # ── Validation ──
    def test_invalid_uuid_is_400(self, student_api_client):
        assert (
            student_api_client.get(f"{ATTEMPTS_URL}?exam_id=nope").status_code
            == status.HTTP_400_BAD_REQUEST
        )

    def test_unknown_exam_is_404(self, student_api_client):
        url = f"{READINESS_URL}?exam_id=99999999-9999-9999-9999-999999999999"
        assert student_api_client.get(url).status_code == status.HTTP_404_NOT_FOUND

    def test_missing_exam_and_no_target_is_400(self, student_api_client):
        assert (
            student_api_client.get(SECTIONS_URL).status_code
            == status.HTTP_400_BAD_REQUEST
        )

    # ── Permission / ownership ──
    def test_unauthenticated_is_401(self, anonymous_client, exam):
        assert (
            anonymous_client.get(f"{ATTEMPTS_URL}?exam_id={exam.id}").status_code
            == status.HTTP_401_UNAUTHORIZED
        )

    def test_does_not_leak_other_users_trends(self, student_api_client, exam):
        other = UserFactory()
        subject = SubjectFactory(exam=exam)
        a = _scored_attempt(other, exam, timezone.now())
        AttemptSectionAnalyticsFactory(
            attempt=a, scope_type="subject", scope_id=subject.id, accuracy=90
        )
        _readiness(other, exam, timezone.now())

        assert student_api_client.get(f"{ATTEMPTS_URL}?exam_id={exam.id}").data == []
        assert student_api_client.get(f"{SECTIONS_URL}?exam_id={exam.id}").data == []
        assert student_api_client.get(f"{READINESS_URL}?exam_id={exam.id}").data == []
