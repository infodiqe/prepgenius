from celery import shared_task

from attempts.services.attempt_services import submit_expired_attempts


@shared_task(name="attempts.tasks.auto_submit_expired_attempts")
def auto_submit_expired_attempts() -> int:
    return submit_expired_attempts()
