"""Service + rollup-integration tests for the T22 Exam Readiness Engine."""

from decimal import Decimal

import pytest
from django.core.cache import cache

from analytics.models import ExamReadinessScore
from analytics.services.readiness_services import compute_exam_readiness
from analytics.tasks import update_analytics_rollups
from analytics.tests.factories import (
    AttemptSectionAnalyticsFactory,
    UserTopicPerformanceFactory,
    WeakTopicFactory,
)
from accounts.tests.factories import UserFactory
from attempts.tests.factories import (
    ExamAttemptFactory,
    ExamFactory,
    SubjectFactory,
    TopicFactory,
)


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


def _exam_attempt(user, exam, *, accuracy, attempt_type="full_mock"):
    return ExamAttemptFactory(
        user=user,
        exam=exam,
        attempt_type=attempt_type,
        status="scored",
        accuracy=Decimal(str(accuracy)),
        total_questions=10,
    )


@pytest.mark.django_db
class TestComputeExamReadiness:
    def test_provisional_when_no_exam_type_attempt(self):
        user, exam = UserFactory(), ExamFactory()
        # Only a daily practice attempt — not exam-representative.
        _exam_attempt(user, exam, accuracy=90, attempt_type="daily")
        assert compute_exam_readiness(user_id=user.id, exam_id=exam.id) is None
        assert not ExamReadinessScore.objects.filter(user=user, exam=exam).exists()

    def test_computes_and_persists_with_breakdown(self):
        user, exam = UserFactory(), ExamFactory()
        subject = SubjectFactory(exam=exam)
        att = _exam_attempt(user, exam, accuracy=60)
        AttemptSectionAnalyticsFactory(
            attempt=att, scope_type="subject", scope_id=subject.id, accuracy=70
        )
        topic = TopicFactory(subject=subject)
        UserTopicPerformanceFactory(
            user=user, exam=exam, topic=topic, attempts=5, success_rate=80
        )

        row = compute_exam_readiness(user_id=user.id, exam_id=exam.id)
        assert row is not None
        comp = row.components
        assert comp["status"] == "scored"
        assert comp["scores"]["mock_performance"] == 60.0
        assert comp["scores"]["subject_accuracy"] == 70.0
        assert comp["scores"]["topic_accuracy"] == 80.0
        # Default approved weights when exam config is empty.
        assert comp["weights"]["mock_performance"] == 50
        assert comp["weights"]["consistency"] == 5
        assert row.score > 0
        assert comp["band"] in {
            "needs_improvement",
            "developing",
            "on_track",
            "exam_ready",
        }

    def test_guardrail_excludes_practice_from_mock_and_subject(self):
        user, exam = UserFactory(), ExamFactory()
        subject = SubjectFactory(exam=exam)
        # Exam-type attempt: accuracy 40, subject 50.
        mock = _exam_attempt(user, exam, accuracy=40)
        AttemptSectionAnalyticsFactory(
            attempt=mock, scope_type="subject", scope_id=subject.id, accuracy=50
        )
        # Daily practice attempt with inflated numbers — must be ignored.
        daily = _exam_attempt(user, exam, accuracy=100, attempt_type="daily")
        AttemptSectionAnalyticsFactory(
            attempt=daily, scope_type="subject", scope_id=subject.id, accuracy=100
        )

        comp = compute_exam_readiness(user_id=user.id, exam_id=exam.id).components
        assert comp["scores"]["mock_performance"] == 40.0
        assert comp["scores"]["subject_accuracy"] == 50.0
        assert comp["exam_type_attempts"] == 1

    def _high_score_setup(self, user, exam, n_attempts):
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        for _ in range(n_attempts):
            att = _exam_attempt(user, exam, accuracy=100)
            AttemptSectionAnalyticsFactory(
                attempt=att, scope_type="subject", scope_id=subject.id, accuracy=100
            )
        UserTopicPerformanceFactory(
            user=user, exam=exam, topic=topic, attempts=10, success_rate=100
        )

    def test_exam_ready_requires_two_attempts_and_no_sev3(self):
        user, exam = UserFactory(), ExamFactory()
        self._high_score_setup(user, exam, n_attempts=2)

        row = compute_exam_readiness(user_id=user.id, exam_id=exam.id)
        assert float(row.score) >= 80
        assert row.components["band"] == "exam_ready"

    def test_not_exam_ready_with_single_attempt(self):
        user, exam = UserFactory(), ExamFactory()
        self._high_score_setup(user, exam, n_attempts=1)

        row = compute_exam_readiness(user_id=user.id, exam_id=exam.id)
        assert float(row.score) >= 80
        # Gated: only one exam-type attempt → not Exam Ready.
        assert row.components["band"] == "on_track"

    def test_active_severity_3_blocks_exam_ready(self):
        user, exam = UserFactory(), ExamFactory()
        self._high_score_setup(user, exam, n_attempts=2)
        topic2 = TopicFactory(subject=SubjectFactory(exam=exam))
        WeakTopicFactory(
            user=user, exam=exam, topic=topic2, severity=3, status="active"
        )

        row = compute_exam_readiness(user_id=user.id, exam_id=exam.id)
        assert float(row.score) >= 80
        assert row.components["has_active_severity_3_weak_topic"] is True
        assert row.components["band"] == "on_track"

    def test_dedup_no_duplicate_row_when_unchanged(self):
        user, exam = UserFactory(), ExamFactory()
        _exam_attempt(user, exam, accuracy=60)
        compute_exam_readiness(user_id=user.id, exam_id=exam.id)
        compute_exam_readiness(user_id=user.id, exam_id=exam.id)
        assert ExamReadinessScore.objects.filter(user=user, exam=exam).count() == 1

    def test_config_weights_override(self):
        # 100% weight on mock_performance → score equals mock accuracy.
        exam = ExamFactory(
            analytics_rules={
                "readiness_score_weights": {
                    "mock_performance": 100,
                    "subject_accuracy": 0,
                    "topic_accuracy": 0,
                    "consistency": 0,
                    "practice_completion": 0,
                }
            }
        )
        user = UserFactory()
        _exam_attempt(user, exam, accuracy=42)
        row = compute_exam_readiness(user_id=user.id, exam_id=exam.id)
        assert row.score == Decimal("42.00")
        assert row.components["weights"]["mock_performance"] == 100


@pytest.mark.django_db
class TestRollupIntegration:
    def test_rollup_writes_readiness_for_exam_type_attempt(self):
        user, exam = UserFactory(), ExamFactory()
        att = _exam_attempt(user, exam, accuracy=70)

        # Run the analytics rollup task directly (eager) — readiness is computed
        # as part of it (T22 integration).
        update_analytics_rollups.apply(args=[str(att.id)])

        assert ExamReadinessScore.objects.filter(user=user, exam=exam).exists()
