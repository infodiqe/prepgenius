import logging
from uuid import UUID

from celery import shared_task
from django.db import transaction, OperationalError

from attempts.models import ExamAttempt, UserAnswer
from analytics.services.rollup_services import upsert_topic_performance, evaluate_weak_topics
from questions.services import recalculate_question_stats

logger = logging.getLogger(__name__)


@shared_task(
    name="analytics.tasks.update_analytics_rollups",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def update_analytics_rollups(self, attempt_id: str) -> None:
    """Asynchronously rolls up subject, topic, and question statistics after an attempt is scored.

    Retries on OperationalError (e.g. database locks).
    """
    logger.info(f"Starting update_analytics_rollups for attempt {attempt_id}")

    try:
        try:
            attempt_uuid = UUID(attempt_id)
        except ValueError:
            logger.error(f"Invalid attempt_id format: {attempt_id}")
            return

        try:
            attempt = ExamAttempt.objects.get(id=attempt_uuid)
        except ExamAttempt.DoesNotExist:
            logger.error(f"ExamAttempt not found: {attempt_id}")
            return

        if attempt.status != "scored":
            logger.warning(f"ExamAttempt {attempt_id} is not scored. Status is {attempt.status}")
            return

        # Fetch all questions and topics attempted
        answers = UserAnswer.objects.filter(attempt_id=attempt_uuid).select_related(
            "question__subtopic__topic"
        )

        topic_ids = list(
            answers.values_list("question__subtopic__topic_id", flat=True).distinct()
        )
        topic_ids = [t for t in topic_ids if t is not None]

        question_ids = list(
            answers.values_list("question_id", flat=True).distinct()
        )
        question_ids = [q for q in question_ids if q is not None]

        # 1. Upsert topic performance
        for topic_id in topic_ids:
            upsert_topic_performance(
                user_id=attempt.user_id,
                exam_id=attempt.exam_id,
                topic_id=topic_id,
            )

        # 2. Evaluate weak topics
        if topic_ids:
            evaluate_weak_topics(
                user_id=attempt.user_id,
                exam_id=attempt.exam_id,
                topic_ids=topic_ids,
            )

        # 3. Recalculate question stats via questions app service (fully decoupled)
        for question_id in question_ids:
            recalculate_question_stats(question_id=question_id)

        logger.info(f"Successfully processed rollups for attempt {attempt_id}")

    except OperationalError as exc:
        logger.warning(f"Database conflict encountered for attempt {attempt_id}. Retrying... Error: {exc}")
        self.retry(exc=exc)
        return
    except Exception as exc:
        logger.exception(f"Unhandled error in update_analytics_rollups for attempt {attempt_id}: {exc}")
        raise
