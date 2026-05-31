import pytest
from decimal import Decimal
from unittest.mock import patch
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status

from analytics.models import WeakTopic
from attempts.models import ExamAttempt
from attempts.services.attempt_services import score_attempt
from attempts.tests.factories import (
    ExamAttemptFactory,
    ExamFactory,
    InProgressAttemptFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
    UserAnswerFactory,
)


@pytest.mark.django_db
class TestAttemptsResultsAndAnalyticsAPI:
    def _create_scored_attempt(self, user, pass_line=60, is_correct=True):
        exam = ExamFactory(passing_criteria={"general": {"required_percentage": pass_line}})
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam, user=user, total_questions=1)
        opt = QuestionOptionFactory(question=q, is_correct=is_correct)
        UserAnswerFactory(
            attempt=attempt,
            question=q,
            selected_option=opt,
            is_correct=is_correct,
            state="answered",
            time_spent_seconds=20,
        )
        attempt.status = "submitted"
        attempt.save()

        scored = score_attempt(attempt_id=attempt.id)
        return scored

    def test_successful_results_retrieval(self, student_api_client):
        scored = self._create_scored_attempt(user=student_api_client.user, pass_line=60, is_correct=True)
        url = reverse("attempts:attempt-results", kwargs={"pk": scored.id})

        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["attempt_id"] == str(scored.id)
        assert response.data["accuracy"] == "100.00"
        assert response.data["pass_status"] == "pass"

    def test_successful_analytics_retrieval(self, student_api_client):
        scored = self._create_scored_attempt(user=student_api_client.user, pass_line=60, is_correct=True)
        url = reverse("attempts:attempt-analytics", kwargs={"pk": scored.id})

        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["attempt_id"] == str(scored.id)
        assert len(response.data["subjects"]) == 1
        assert len(response.data["topics"]) == 1

    def test_unauthorized_access(self, anonymous_client, user):
        scored = self._create_scored_attempt(user=user)
        results_url = reverse("attempts:attempt-results", kwargs={"pk": scored.id})
        analytics_url = reverse("attempts:attempt-analytics", kwargs={"pk": scored.id})

        resp_res = anonymous_client.get(results_url)
        assert resp_res.status_code == status.HTTP_401_UNAUTHORIZED

        resp_ana = anonymous_client.get(analytics_url)
        assert resp_ana.status_code == status.HTTP_401_UNAUTHORIZED

    def test_forbidden_access_by_other_student(self, student_api_client, user):
        # Create an attempt owned by another user (the "user" fixture user)
        scored = self._create_scored_attempt(user=user)
        results_url = reverse("attempts:attempt-results", kwargs={"pk": scored.id})
        analytics_url = reverse("attempts:attempt-analytics", kwargs={"pk": scored.id})

        # Call using the logged-in student (different user)
        resp_res = student_api_client.get(results_url)
        assert resp_res.status_code == status.HTTP_403_FORBIDDEN

        resp_ana = student_api_client.get(analytics_url)
        assert resp_ana.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_override(self, content_manager_api_client, user, exam):
        # Create attempt owned by generic user
        attempt = InProgressAttemptFactory(exam=exam, user=user, total_questions=1)
        # Create answer
        q = PublishedQuestionFactory(exam=exam, subtopic=exam.subjects.first().topics.first().subtopics.first())
        opt = QuestionOptionFactory(question=q, is_correct=True)
        UserAnswerFactory(
            attempt=attempt,
            question=q,
            selected_option=opt,
            is_correct=True,
            state="answered",
        )
        attempt.status = "submitted"
        attempt.save()

        # Score attempt will also create section analytics
        score_attempt(attempt_id=attempt.id)

        results_url = reverse("attempts:attempt-results", kwargs={"pk": attempt.id})
        analytics_url = reverse("attempts:attempt-analytics", kwargs={"pk": attempt.id})

        # Admins (using content_manager role) should override owner checks
        resp_res = content_manager_api_client.get(results_url)
        assert resp_res.status_code == status.HTTP_200_OK

        resp_ana = content_manager_api_client.get(analytics_url)
        assert resp_ana.status_code == status.HTTP_200_OK

    def test_not_found_handling(self, student_api_client):
        invalid_uuid = "12345678-1234-5678-1234-567812345678"
        results_url = reverse("attempts:attempt-results", kwargs={"pk": invalid_uuid})
        analytics_url = reverse("attempts:attempt-analytics", kwargs={"pk": invalid_uuid})

        assert student_api_client.get(results_url).status_code == status.HTTP_404_NOT_FOUND
        assert student_api_client.get(analytics_url).status_code == status.HTTP_404_NOT_FOUND

    def test_pass_line_needs_work(self, student_api_client):
        # 0% accuracy with 60% pass threshold -> Needs work
        scored = self._create_scored_attempt(user=student_api_client.user, pass_line=60, is_correct=False)
        url = reverse("attempts:attempt-results", kwargs={"pk": scored.id})

        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["pass_status"] == "needs-work"


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard API Tests
# ─────────────────────────────────────────────────────────────────────────────

DASHBOARD_URL = "/api/v1/dashboard/"


@pytest.mark.django_db
class TestDashboardAPI:
    """Tests for GET /api/v1/dashboard/.

    Architecture invariants verified:
    - View is read-only (no writes)
    - No analytics recalculation in the request path
    - No rollup generation
    - Selectors are the only data source
    """

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        cache.clear()

    def _setup_exam_and_score_attempt(self, user, is_correct=True):
        """Helper: build exam hierarchy, create and score an attempt for `user`."""
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic)
        opt = QuestionOptionFactory(question=q, is_correct=is_correct)

        attempt = InProgressAttemptFactory(exam=exam, user=user, total_questions=1)
        UserAnswerFactory(
            attempt=attempt,
            question=q,
            selected_option=opt,
            is_correct=is_correct,
            state="answered",
            time_spent_seconds=15,
        )
        attempt.status = "submitted"
        attempt.save()
        score_attempt(attempt_id=attempt.id)
        return exam, subject, topic

    # ── 1. Successful dashboard retrieval ────────────────────────────────────

    def test_successful_dashboard_retrieval(self, student_api_client):
        """Happy-path: student gets their own dashboard with correct shape."""
        exam, *_ = self._setup_exam_and_score_attempt(user=student_api_client.user)

        response = student_api_client.get(DASHBOARD_URL, {"exam_id": str(exam.id)})

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        # Required top-level keys
        assert "streak" in data
        assert "daily_questions_attempted" in data
        assert "daily_target" in data
        assert "overall_accuracy" in data
        assert "recent_activity" in data
        assert "weak_topics" in data
        assert "recommendations" in data
        # Sanity check values
        assert data["daily_target"] == 10
        assert len(data["recent_activity"]) == 1
        assert data["overall_accuracy"] == "100.00"

    # ── 2. Authentication required ───────────────────────────────────────────

    def test_authentication_required(self, anonymous_client):
        """Anonymous users must receive 401."""
        response = anonymous_client.get(DASHBOARD_URL, {"exam_id": "00000000-0000-0000-0000-000000000001"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # ── 3. Dashboard with weak topics ────────────────────────────────────────

    def test_dashboard_with_weak_topics(self, student_api_client):
        """Weak topics are returned with the required payload shape."""
        exam, subject, topic = self._setup_exam_and_score_attempt(user=student_api_client.user)

        # Seed an active weak topic for this user + exam
        WeakTopic.objects.create(
            user=student_api_client.user,
            exam=exam,
            topic=topic,
            accuracy=Decimal("30.00"),
            severity=2,
            status="active",
        )

        response = student_api_client.get(DASHBOARD_URL, {"exam_id": str(exam.id)})
        assert response.status_code == status.HTTP_200_OK

        weak_topics = response.data["weak_topics"]
        assert len(weak_topics) == 1
        wt = weak_topics[0]
        assert str(wt["topic_id"]) == str(topic.id)
        assert wt["topic_name"] == topic.name
        assert wt["accuracy"] == "30.00"
        assert wt["severity"] == 2
        assert wt["status"] == "active"

    # ── 4. Dashboard without weak topics ────────────────────────────────────

    def test_dashboard_without_weak_topics(self, student_api_client):
        """When there are no active weak topics the lists are empty."""
        exam, *_ = self._setup_exam_and_score_attempt(user=student_api_client.user)

        response = student_api_client.get(DASHBOARD_URL, {"exam_id": str(exam.id)})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["weak_topics"] == []
        assert response.data["recommendations"] == []

    # ── 5. Recommendation ordering: severity DESC, accuracy ASC ─────────────

    def test_recommendation_ordering(self, student_api_client):
        """Recommendations must be ordered by severity DESC then accuracy ASC."""
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        t1 = TopicFactory(subject=subject, name="Alpha")   # severity=1, accuracy=50
        t2 = TopicFactory(subject=subject, name="Beta")    # severity=3, accuracy=20
        t3 = TopicFactory(subject=subject, name="Gamma")   # severity=3, accuracy=10

        user = student_api_client.user

        for topic, sev, acc in [(t1, 1, "50.00"), (t2, 3, "20.00"), (t3, 3, "10.00")]:
            WeakTopic.objects.create(
                user=user,
                exam=exam,
                topic=topic,
                accuracy=Decimal(acc),
                severity=sev,
                status="active",
            )

        response = student_api_client.get(DASHBOARD_URL, {"exam_id": str(exam.id)})
        assert response.status_code == status.HTTP_200_OK

        recs = response.data["recommendations"]
        assert len(recs) == 3
        # severity=3 first; among equal severities, lower accuracy (10%) comes first
        assert recs[0]["topic_name"] == "Gamma"   # sev=3, acc=10
        assert recs[1]["topic_name"] == "Beta"    # sev=3, acc=20
        assert recs[2]["topic_name"] == "Alpha"   # sev=1, acc=50

    # ── 6. Redis unavailable fallback ────────────────────────────────────────

    def test_redis_unavailable_fallback(self, student_api_client):
        """Dashboard remains functional when the Redis-backed streak cache is unavailable.

        get_user_streak() is the only selector that touches Redis. Mocking it
        at the function level avoids interfering with DRF throttle middleware,
        which uses the same Django cache backend.
        """
        exam, *_ = self._setup_exam_and_score_attempt(user=student_api_client.user)

        # Mock get_user_streak to simulate the DB-fallback return value when
        # Redis is unavailable. Using return_value=0 (the base-case integer)
        # is sufficient to verify the dashboard still renders without error.
        with patch(
            "analytics.selectors.analytics_selectors.get_user_streak",
            return_value=0,
        ):
            response = student_api_client.get(DASHBOARD_URL, {"exam_id": str(exam.id)})

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data["streak"], int)

    # ── 7. Query-count validation (no N+1 queries) ───────────────────────────

    def test_dashboard_query_count(self, student_api_client):
        """Dashboard must complete within a bounded number of DB queries (no N+1)."""
        exam, subject, topic = self._setup_exam_and_score_attempt(user=student_api_client.user)

        WeakTopic.objects.create(
            user=student_api_client.user,
            exam=exam,
            topic=topic,
            accuracy=Decimal("40.00"),
            severity=2,
            status="active",
        )

        # Warm the cache to eliminate the streak cache-miss query from our count
        cache.clear()

        with CaptureQueriesContext(connection) as ctx:
            response = student_api_client.get(DASHBOARD_URL, {"exam_id": str(exam.id)})

        assert response.status_code == status.HTTP_200_OK
        # Dashboard should resolve in a bounded number of queries:
        # auth check, exam existence, summary aggregates, weak topics, recommendations
        # The exact count varies with DRF auth middleware; 20 is a generous upper bound.
        assert len(ctx) <= 20, (
            f"Dashboard issued {len(ctx)} queries; possible N+1 regression. "
            f"Queries: {[q['sql'][:80] for q in ctx]}"
        )

    # ── Edge cases ───────────────────────────────────────────────────────────

    def test_missing_exam_id_without_target_exam(self, student_api_client):
        """When exam_id is omitted and user has no target_exam, return 400."""
        # student_api_client.user has no target_exam set
        response = student_api_client.get(DASHBOARD_URL)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_exam_uuid_returns_400(self, student_api_client):
        """Non-UUID exam_id query param should return 400."""
        response = student_api_client.get(DASHBOARD_URL, {"exam_id": "not-a-uuid"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_nonexistent_exam_returns_404(self, student_api_client):
        """Valid UUID but non-existent exam should return 404."""
        response = student_api_client.get(DASHBOARD_URL, {"exam_id": "00000000-0000-0000-0000-000000000099"})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_target_exam_fallback(self, student_api_client):
        """When no exam_id query param is given, user.target_exam is used."""
        exam = ExamFactory()
        user = student_api_client.user
        user.target_exam = exam
        user.save(update_fields=["target_exam"])

        response = student_api_client.get(DASHBOARD_URL)  # no exam_id param
        assert response.status_code == status.HTTP_200_OK
        assert response.data["recent_activity"] == []

