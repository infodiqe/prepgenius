import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.db import OperationalError, transaction
from django.utils import timezone

from analytics.models import UserTopicPerformance, WeakTopic
from analytics.services.rollup_services import upsert_topic_performance, evaluate_weak_topics
from analytics.tasks import update_analytics_rollups
from attempts.models import UserAnswer, ExamAttempt
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
from questions.models import QuestionStat
from questions.services import recalculate_question_stats


@pytest.mark.django_db
class TestRollupServices:
    def test_topic_performance_creation(self) -> None:
        exam = ExamFactory(analytics_rules={"weak_topic_threshold": 60})
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)
        q2 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam, total_questions=2)
        opt1_correct = QuestionOptionFactory(question=q1, is_correct=True)
        opt2_incorrect = QuestionOptionFactory(question=q2, is_correct=False)

        a1 = UserAnswerFactory(
            attempt=attempt,
            question=q1,
            selected_option=opt1_correct,
            is_correct=True,
            state="answered",
            time_spent_seconds=30,
            answered_at=timezone.now(),
        )
        a2 = UserAnswerFactory(
            attempt=attempt,
            question=q2,
            selected_option=opt2_incorrect,
            is_correct=False,
            state="answered",
            time_spent_seconds=50,
            answered_at=timezone.now(),
        )

        attempt.status = "submitted"
        attempt.save()

        # Score attempt (this synchronously computes section analytics and schedules the task)
        score_attempt(attempt_id=attempt.id)

        # Directly run upsert_topic_performance to verify behavior
        utp = upsert_topic_performance(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_id=topic.id,
        )

        assert isinstance(utp, UserTopicPerformance)
        assert utp.attempts == 2
        assert utp.correct == 1
        assert utp.success_rate == Decimal("50.00")
        assert utp.avg_time == Decimal("40.00")
        assert utp.last_practiced_at is not None

    def test_topic_performance_update(self) -> None:
        exam = ExamFactory(analytics_rules={"weak_topic_threshold": 60})
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt1 = InProgressAttemptFactory(exam=exam, total_questions=1)
        opt_correct = QuestionOptionFactory(question=q1, is_correct=True)
        UserAnswerFactory(
            attempt=attempt1,
            question=q1,
            selected_option=opt_correct,
            is_correct=True,
            state="answered",
            time_spent_seconds=20,
            answered_at=timezone.now(),
        )
        attempt1.status = "submitted"
        attempt1.save()
        score_attempt(attempt_id=attempt1.id)

        # Run rollup 1
        utp = upsert_topic_performance(
            user_id=attempt1.user_id,
            exam_id=attempt1.exam_id,
            topic_id=topic.id,
        )
        assert utp.attempts == 1
        assert utp.correct == 1
        assert utp.success_rate == Decimal("100.00")

        # Create second attempt for the same user and topic
        attempt2 = InProgressAttemptFactory(exam=exam, user=attempt1.user, total_questions=1)
        opt_incorrect = QuestionOptionFactory(question=q1, is_correct=False)
        UserAnswerFactory(
            attempt=attempt2,
            question=q1,
            selected_option=opt_incorrect,
            is_correct=False,
            state="answered",
            time_spent_seconds=40,
            answered_at=timezone.now(),
        )
        attempt2.status = "submitted"
        attempt2.save()
        score_attempt(attempt_id=attempt2.id)

        # Run rollup 2
        utp_updated = upsert_topic_performance(
            user_id=attempt1.user_id,
            exam_id=attempt1.exam_id,
            topic_id=topic.id,
        )

        # UTP row should be updated (same ID)
        assert utp_updated.id == utp.id
        assert utp_updated.attempts == 2
        assert utp_updated.correct == 1
        assert utp_updated.success_rate == Decimal("50.00")
        assert utp_updated.avg_time == Decimal("30.00")

    def test_weak_topic_creation(self) -> None:
        exam = ExamFactory(analytics_rules={"weak_topic_threshold": 60})
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam, total_questions=1)
        opt_incorrect = QuestionOptionFactory(question=q1, is_correct=False)
        UserAnswerFactory(
            attempt=attempt,
            question=q1,
            selected_option=opt_incorrect,
            is_correct=False,
            state="answered",
            time_spent_seconds=30,
            answered_at=timezone.now(),
        )
        attempt.status = "submitted"
        attempt.save()
        score_attempt(attempt_id=attempt.id)

        # Upsert performance to 0% accuracy
        upsert_topic_performance(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_id=topic.id,
        )

        # Evaluate weak topics
        weak_topics = evaluate_weak_topics(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_ids=[topic.id],
        )

        assert len(weak_topics) == 1
        weak = weak_topics[0]
        assert weak.topic == topic
        assert weak.status == "active"
        assert weak.accuracy == Decimal("0.00")
        # diff is 60 - 0 = 60 >= 30, so severity is 3
        assert weak.severity == 3

    def test_weak_topic_severity_buckets(self) -> None:
        exam = ExamFactory(analytics_rules={"weak_topic_threshold": 60})
        subject = SubjectFactory(exam=exam)
        topic1 = TopicFactory(subject=subject)
        topic2 = TopicFactory(subject=subject)
        subtopic1 = SubtopicFactory(topic=topic1)
        subtopic2 = SubtopicFactory(topic=topic2)

        user = ExamAttemptFactory(exam=exam).user

        # Setup Topic 1 performance: 50% accuracy (diff = 10, severity = 1)
        utp1 = UserTopicPerformance.objects.create(
            user=user, exam=exam, topic=topic1, attempts=2, correct=1, success_rate=Decimal("50.00")
        )
        # Setup Topic 2 performance: 40% accuracy (diff = 20, severity = 2)
        utp2 = UserTopicPerformance.objects.create(
            user=user, exam=exam, topic=topic2, attempts=5, correct=2, success_rate=Decimal("40.00")
        )

        weak_topics = evaluate_weak_topics(
            user_id=user.id,
            exam_id=exam.id,
            topic_ids=[topic1.id, topic2.id],
        )

        w1 = WeakTopic.objects.get(user=user, topic=topic1)
        assert w1.severity == 1
        w2 = WeakTopic.objects.get(user=user, topic=topic2)
        assert w2.severity == 2

    def test_weak_topic_improvement(self) -> None:
        exam = ExamFactory(analytics_rules={"weak_topic_threshold": 60})
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam, total_questions=1)
        opt_incorrect = QuestionOptionFactory(question=q1, is_correct=False)
        UserAnswerFactory(
            attempt=attempt,
            question=q1,
            selected_option=opt_incorrect,
            is_correct=False,
            state="answered",
            time_spent_seconds=30,
            answered_at=timezone.now(),
        )
        attempt.status = "submitted"
        attempt.save()
        score_attempt(attempt_id=attempt.id)

        upsert_topic_performance(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_id=topic.id,
        )
        evaluate_weak_topics(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_ids=[topic.id],
        )

        # Confirm weak topic is active
        w = WeakTopic.objects.get(user=attempt.user, topic=topic)
        assert w.status == "active"

        # Now, create attempt 2 which gets 100% correct
        attempt2 = InProgressAttemptFactory(exam=exam, user=attempt.user, total_questions=1)
        opt_correct = QuestionOptionFactory(question=q1, is_correct=True)
        UserAnswerFactory(
            attempt=attempt2,
            question=q1,
            selected_option=opt_correct,
            is_correct=True,
            state="answered",
            time_spent_seconds=15,
            answered_at=timezone.now(),
        )
        attempt2.status = "submitted"
        attempt2.save()
        score_attempt(attempt_id=attempt2.id)

        upsert_topic_performance(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_id=topic.id,
        )
        evaluate_weak_topics(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_ids=[topic.id],
        )

        w.refresh_from_db()
        # 50.00% is still below 60.00% threshold, so status remains active
        assert w.status == "active"
        assert w.accuracy == Decimal("50.00")

        # Now, create attempt 3 which gets another correct answer
        attempt3 = InProgressAttemptFactory(exam=exam, user=attempt.user, total_questions=1)
        UserAnswerFactory(
            attempt=attempt3,
            question=q1,
            selected_option=opt_correct,
            is_correct=True,
            state="answered",
            time_spent_seconds=15,
            answered_at=timezone.now(),
        )
        attempt3.status = "submitted"
        attempt3.save()
        score_attempt(attempt_id=attempt3.id)

        upsert_topic_performance(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_id=topic.id,
        )
        evaluate_weak_topics(
            user_id=attempt.user_id,
            exam_id=attempt.exam_id,
            topic_ids=[topic.id],
        )

        w.refresh_from_db()
        # 2 correct out of 3 attempts = 66.67% accuracy >= 60% threshold
        assert w.status == "improving"
        assert w.accuracy == Decimal("66.67")

    def test_idempotent_reprocessing(self) -> None:
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
            time_spent_seconds=20,
            answered_at=timezone.now(),
        )
        attempt.status = "scored"
        attempt.save()

        # Run upsert_topic_performance multiple times
        utp1 = upsert_topic_performance(user_id=attempt.user_id, exam_id=attempt.exam_id, topic_id=topic.id)
        utp2 = upsert_topic_performance(user_id=attempt.user_id, exam_id=attempt.exam_id, topic_id=topic.id)

        assert utp1.id == utp2.id
        assert utp1.attempts == utp2.attempts == 1
        assert utp1.correct == utp2.correct == 1
        assert utp1.success_rate == utp2.success_rate == Decimal("100.00")

        # Run recalculate_question_stats multiple times
        q_stat1 = recalculate_question_stats(question_id=q.id)
        q_stat2 = recalculate_question_stats(question_id=q.id)

        assert q_stat1.attempts == q_stat2.attempts == 1
        assert q_stat1.correct == q_stat2.correct == 1
        assert q_stat1.success_rate == q_stat2.success_rate == Decimal("100.00")

    def test_concurrency_protection(self) -> None:
        # Verify that select_for_update is used in the services
        with patch("django.db.models.QuerySet.select_for_update") as mock_select_for_update:
            mock_select_for_update.return_value = UserTopicPerformance.objects.all()

            exam = ExamFactory()
            subject = SubjectFactory(exam=exam)
            topic = TopicFactory(subject=subject)

            upsert_topic_performance(user_id=exam.attempts.first().user_id if exam.attempts.exists() else InProgressAttemptFactory(exam=exam).user_id, exam_id=exam.id, topic_id=topic.id)
            assert mock_select_for_update.called

    @patch("analytics.tasks.analytics_tasks.upsert_topic_performance")
    def test_celery_retry_behavior(self, mock_upsert: MagicMock) -> None:
        # Mock upsert_topic_performance to raise OperationalError (DB locking error)
        mock_upsert.side_effect = OperationalError("Lock wait timeout exceeded")

        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic)

        attempt = InProgressAttemptFactory(exam=exam)
        opt = QuestionOptionFactory(question=q, is_correct=True)
        UserAnswerFactory(
            attempt=attempt,
            question=q,
            selected_option=opt,
            is_correct=True,
            state="answered",
        )
        attempt.status = "scored"
        attempt.save()

        # Instantiate task
        task = update_analytics_rollups

        # We patch retry on the task to assert it is called when database lock occurs
        with patch.object(task, "retry") as mock_retry:
            task(attempt_id=str(attempt.id))
            assert mock_retry.called
            # Ensure it propagates retry back
            mock_retry.assert_called_once()
