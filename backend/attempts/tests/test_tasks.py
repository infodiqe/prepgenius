"""Celery task wiring tests for the attempts app (PH-1.1)."""
from datetime import timedelta

from django.utils import timezone

from attempts.services.attempt_services import create_attempt, start_attempt
from attempts.tasks import auto_submit_expired_attempts


class TestAutoSubmitExpiredAttemptsTask:
    def test_task_finalizes_expired_attempt_and_returns_count(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=60,
        )
        start_attempt(attempt_id=attempt.id)
        attempt.started_at = timezone.now() - timedelta(seconds=61)
        attempt.save(update_fields=["started_at"])

        # Call the task body directly (no broker needed); it delegates to the
        # service and returns the number of attempts finalized.
        result = auto_submit_expired_attempts()

        attempt.refresh_from_db()
        assert result == 1
        assert attempt.status == "scored"

    def test_task_is_noop_with_no_expired_attempts(self):
        assert auto_submit_expired_attempts() == 0
