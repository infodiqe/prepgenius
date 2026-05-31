import datetime
import pytest
from decimal import Decimal
from unittest.mock import patch
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from analytics.models import AttemptSectionAnalytics, UserTopicPerformance, WeakTopic
from analytics.selectors import (
    get_attempt_results,
    get_attempt_analytics,
    get_user_topic_performance,
    get_active_weak_topics,
    get_user_streak,
    get_daily_questions_attempted,
    get_dashboard_summary,
    get_weak_topic_recommendations,
)
from attempts.models import ExamAttempt, UserAnswer
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
class TestAnalyticsSelectors:
    @pytest.fixture(autouse=True)
    def clear_cache_before_each_test(self) -> None:
        cache.clear()

    def test_get_attempt_results_correctness(self) -> None:
        exam = ExamFactory(passing_criteria={"general": {"required_percentage": 60}})
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        # Scored with 100% accuracy -> passed
        attempt1 = InProgressAttemptFactory(exam=exam, total_questions=1)
        opt = QuestionOptionFactory(question=q, is_correct=True)
        UserAnswerFactory(
            attempt=attempt1,
            question=q,
            selected_option=opt,
            is_correct=True,
            state="answered",
            time_spent_seconds=20,
        )
        attempt1.status = "submitted"
        attempt1.save()
        scored_attempt1 = score_attempt(attempt_id=attempt1.id)

        res1 = get_attempt_results(attempt_id=scored_attempt1.id)
        assert res1["attempt_id"] == scored_attempt1.id
        assert res1["accuracy"] == Decimal("100.00")
        assert res1["pass_status"] == "pass"

        # Scored with 0% accuracy -> fail
        attempt2 = InProgressAttemptFactory(exam=exam, total_questions=1, user=attempt1.user)
        opt_incorrect = QuestionOptionFactory(question=q, is_correct=False)
        UserAnswerFactory(
            attempt=attempt2,
            question=q,
            selected_option=opt_incorrect,
            is_correct=False,
            state="answered",
            time_spent_seconds=30,
        )
        attempt2.status = "submitted"
        attempt2.save()
        scored_attempt2 = score_attempt(attempt_id=attempt2.id)

        res2 = get_attempt_results(attempt_id=scored_attempt2.id)
        assert res2["pass_status"] == "needs-work"

        # Fails on unscored attempt
        unscored = InProgressAttemptFactory(exam=exam)
        with pytest.raises(ValueError, match="Attempt is not scored"):
            get_attempt_results(attempt_id=unscored.id)

    def test_get_attempt_analytics_correctness(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam, name="Maths")
        topic = TopicFactory(subject=subject, name="Algebra")
        subtopic = SubtopicFactory(topic=topic)
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam, total_questions=1)
        opt = QuestionOptionFactory(question=q, is_correct=True)
        UserAnswerFactory(
            attempt=attempt,
            question=q,
            selected_option=opt,
            is_correct=True,
            state="answered",
            time_spent_seconds=15,
        )
        attempt.status = "submitted"
        attempt.save()
        scored = score_attempt(attempt_id=attempt.id)

        # Retrieve analytics
        analytics = get_attempt_analytics(attempt_id=scored.id)
        assert analytics["attempt_id"] == scored.id
        
        # Verify subject breakdown
        subjects = analytics["subjects"]
        assert len(subjects) == 1
        assert subjects[0]["name"] == "Maths"
        assert subjects[0]["scope_id"] == subject.id
        assert subjects[0]["total"] == 1
        assert subjects[0]["correct"] == 1
        assert subjects[0]["accuracy"] == Decimal("100.00")
        assert subjects[0]["avg_time"] == Decimal("15.00")

        # Verify topic breakdown
        topics = analytics["topics"]
        assert len(topics) == 1
        assert topics[0]["name"] == "Algebra"
        assert topics[0]["scope_id"] == topic.id

        # Query count validation for N+1 queries:
        # Expected queries:
        # 1. Fetch AttemptSectionAnalytics
        # 2. Bulk fetch Subjects
        # 3. Bulk fetch Topics
        # Total queries should be exactly 3.
        with CaptureQueriesContext(connection) as ctx:
            get_attempt_analytics(attempt_id=scored.id)
        assert len(ctx) == 3

    def test_get_user_topic_performance(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject, name="Physics")
        user = ExamAttemptFactory(exam=exam).user

        utp = UserTopicPerformance.objects.create(
            user=user,
            exam=exam,
            topic=topic,
            attempts=5,
            correct=3,
            success_rate=Decimal("60.00"),
            avg_time=Decimal("42.50"),
            last_practiced_at=timezone.now(),
        )

        perf = get_user_topic_performance(user_id=user.id, exam_id=exam.id)
        assert len(perf) == 1
        p = perf[0]
        assert p["topic_name"] == "Physics"
        assert p["attempts"] == 5
        assert p["success_rate"] == Decimal("60.00")

        # Query count validation (single select_related query)
        with CaptureQueriesContext(connection) as ctx:
            get_user_topic_performance(user_id=user.id, exam_id=exam.id)
        assert len(ctx) == 1

    def test_get_active_weak_topics(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject, name="History")
        user = ExamAttemptFactory(exam=exam).user

        # Active weak topic
        WeakTopic.objects.create(
            user=user, exam=exam, topic=topic, accuracy=Decimal("40.00"), severity=2, status="active"
        )
        # Inactive/resolved weak topic (should not be returned)
        topic2 = TopicFactory(subject=subject, name="Geography")
        WeakTopic.objects.create(
            user=user, exam=exam, topic=topic2, accuracy=Decimal("80.00"), severity=1, status="resolved"
        )

        active = get_active_weak_topics(user_id=user.id, exam_id=exam.id)
        assert len(active) == 1
        assert active[0]["topic_name"] == "History"
        assert active[0]["status"] == "active"

    def test_get_user_streak_and_redis_fallback(self) -> None:
        from accounts.tests.factories import UserFactory
        exam = ExamFactory()
        user = UserFactory()

        # Empty attempts streak is 0
        assert get_user_streak(user_id=user.id) == 0

        # Create attempts on consecutive days (today and yesterday)
        today = timezone.now()
        yesterday = today - datetime.timedelta(days=1)

        # Create attempt yesterday
        with patch("django.utils.timezone.now", return_value=yesterday):
            ExamAttempt.objects.create(user=user, exam=exam, status="scored", created_at=yesterday)
        
        # Create attempt today
        with patch("django.utils.timezone.now", return_value=today):
            ExamAttempt.objects.create(user=user, exam=exam, status="scored", created_at=today)

        # Clear cache first to test DB calculation
        cache.clear()
        assert get_user_streak(user_id=user.id) == 2

        # Verify it has set the cache (hitting cache next time, query count is 0)
        with CaptureQueriesContext(connection) as ctx:
            streak = get_user_streak(user_id=user.id)
        assert streak == 2
        assert len(ctx) == 0

        # Test Redis fallback (connection error)
        with patch("django.core.cache.cache.get", side_effect=Exception("Redis disconnected")):
            with patch("django.core.cache.cache.set", side_effect=Exception("Redis disconnected")):
                # Should not raise exception and return correct value from DB
                assert get_user_streak(user_id=user.id) == 2

    def test_get_daily_questions_attempted(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)
        q2 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam)
        opt = QuestionOptionFactory(question=q1, is_correct=True)

        UserAnswerFactory(
            attempt=attempt,
            question=q1,
            selected_option=opt,
            state="answered",
            created_at=timezone.now(),
        )
        UserAnswerFactory(
            attempt=attempt,
            question=q2,
            selected_option=None,
            state="skipped",  # skipped shouldn't count
            created_at=timezone.now(),
        )

        assert get_daily_questions_attempted(user_id=attempt.user_id) == 1

    def test_dashboard_summary(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam, total_questions=1)
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
        score_attempt(attempt_id=attempt.id)

        summary = get_dashboard_summary(user_id=attempt.user, exam_id=exam.id)
        assert summary["streak"] == 1
        assert summary["daily_questions_attempted"] == 1
        assert summary["daily_target"] == 10
        assert summary["overall_accuracy"] == Decimal("100.00")
        assert len(summary["recent_activity"]) == 1

    def test_get_weak_topic_recommendations(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam, name="Science")
        topic1 = TopicFactory(subject=subject, name="Physics")
        topic2 = TopicFactory(subject=subject, name="Chemistry")
        topic3 = TopicFactory(subject=subject, name="Biology")
        user = ExamAttemptFactory(exam=exam).user

        # Create weak topics with different severity & accuracy:
        # topic1: severity 1, accuracy 50%
        # topic2: severity 3, accuracy 20%
        # topic3: severity 3, accuracy 10%
        WeakTopic.objects.create(
            user=user, exam=exam, topic=topic1, accuracy=Decimal("50.00"), severity=1, status="active"
        )
        WeakTopic.objects.create(
            user=user, exam=exam, topic=topic2, accuracy=Decimal("20.00"), severity=3, status="active"
        )
        WeakTopic.objects.create(
            user=user, exam=exam, topic=topic3, accuracy=Decimal("10.00"), severity=3, status="active"
        )

        recs = get_weak_topic_recommendations(user_id=user.id, exam_id=exam.id)
        
        # Expected sort order:
        # 1. severity desc: topic3 (3), topic2 (3) first.
        # 2. accuracy asc: topic3 (10%) then topic2 (20%).
        # 3. severity desc: topic1 (1).
        # Order: Biology (topic3), Chemistry (topic2), Physics (topic1).
        assert len(recs) == 3
        assert recs[0]["topic_name"] == "Biology"
        assert recs[1]["topic_name"] == "Chemistry"
        assert recs[2]["topic_name"] == "Physics"

        # Query count validation (single select_related query)
        with CaptureQueriesContext(connection) as ctx:
            get_weak_topic_recommendations(user_id=user.id, exam_id=exam.id)
        assert len(ctx) == 1
