import logging
from decimal import Decimal
from uuid import UUID

from django.db import transaction
from django.db.models import Count, Q, Avg, Max

from analytics.models import UserTopicPerformance, WeakTopic
from attempts.models import UserAnswer
from exams.models import Exam

logger = logging.getLogger(__name__)


def upsert_topic_performance(
    *, user_id: UUID, exam_id: UUID, topic_id: UUID
) -> UserTopicPerformance:
    """Idempotently aggregates and upserts user performance for a given topic.

    Uses select_for_update to handle concurrency safely.
    """
    with transaction.atomic():
        # Ensure row exists and lock it
        performance, created = UserTopicPerformance.objects.get_or_create(
            user_id=user_id,
            exam_id=exam_id,
            topic_id=topic_id,
        )
        performance = UserTopicPerformance.objects.select_for_update().get(
            id=performance.id
        )

        # Aggregate UserAnswers for this user/exam/topic under scored attempts
        res = UserAnswer.objects.filter(
            attempt__user_id=user_id,
            attempt__exam_id=exam_id,
            question__subtopic__topic_id=topic_id,
            attempt__status="scored",
            state__in=["answered", "answered_marked"],
        ).aggregate(
            total_attempts=Count("id"),
            total_correct=Count("id", filter=Q(is_correct=True)),
            avg_time_spent=Avg("time_spent_seconds"),
            last_practiced=Max("answered_at"),
        )

        attempts = res["total_attempts"] or 0
        correct = res["total_correct"] or 0
        avg_time = res["avg_time_spent"] or 0.0
        last_practiced = res["last_practiced"]

        performance.attempts = attempts
        performance.correct = correct
        performance.success_rate = (
            Decimal(str(round((correct / attempts) * 100, 2)))
            if attempts > 0
            else Decimal("0.00")
        )
        performance.avg_time = (
            Decimal(str(round(avg_time, 2))) if avg_time else Decimal("0.00")
        )
        performance.last_practiced_at = last_practiced

        performance.save(
            update_fields=[
                "attempts",
                "correct",
                "success_rate",
                "avg_time",
                "last_practiced_at",
            ]
        )
        performance.refresh_from_db()

    return performance


def evaluate_weak_topics(
    *, user_id: UUID, exam_id: UUID, topic_ids: list[UUID]
) -> list[WeakTopic]:
    """Evaluates the user's weak topics based on their topic performance.

    Transitions active weak topics to 'improving' when accuracy meets/exceeds the threshold.
    """
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        return []

    threshold = Decimal(str(exam.analytics_rules.get("weak_topic_threshold", 60)))
    evaluated_weak_topics = []

    for topic_id in topic_ids:
        with transaction.atomic():
            # Get locked topic performance
            try:
                performance = UserTopicPerformance.objects.select_for_update().get(
                    user_id=user_id,
                    exam_id=exam_id,
                    topic_id=topic_id,
                )
            except UserTopicPerformance.DoesNotExist:
                continue

            if performance.attempts == 0:
                continue

            accuracy = performance.success_rate
            diff = threshold - accuracy
            if diff >= 30:
                severity = 3
            elif diff >= 15:
                severity = 2
            else:
                severity = 1

            weak_topic = WeakTopic.objects.select_for_update().filter(
                user_id=user_id,
                exam_id=exam_id,
                topic_id=topic_id,
            ).first()

            if accuracy < threshold:
                if not weak_topic:
                    weak_topic = WeakTopic.objects.create(
                        user_id=user_id,
                        exam_id=exam_id,
                        topic_id=topic_id,
                        accuracy=accuracy,
                        severity=severity,
                        status="active",
                    )
                else:
                    weak_topic.accuracy = accuracy
                    weak_topic.severity = severity
                    weak_topic.status = "active"
                    weak_topic.save(update_fields=["accuracy", "severity", "status"])
            else:
                # accuracy >= threshold
                if weak_topic:
                    if weak_topic.status == "active":
                        weak_topic.status = "improving"
                    weak_topic.accuracy = accuracy
                    weak_topic.severity = 1
                    weak_topic.save(update_fields=["accuracy", "severity", "status"])

            if weak_topic:
                evaluated_weak_topics.append(weak_topic)

    return evaluated_weak_topics
