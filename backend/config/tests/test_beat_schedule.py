"""PH-1.1: guard the periodic auto-submit schedule registration.

If this entry is renamed/dropped or the interval/queue changes, expired attempts
would silently stop being auto-finalized server-side. The schedule lives in
settings (config/settings/base.py) and is synced to the DB by the
DatabaseScheduler that celery-beat runs.
"""
from django.conf import settings


def test_database_scheduler_is_configured() -> None:
    assert (
        settings.CELERY_BEAT_SCHEDULER
        == "django_celery_beat.schedulers:DatabaseScheduler"
    )


def test_auto_submit_schedule_registered() -> None:
    entry = settings.CELERY_BEAT_SCHEDULE["auto-submit-expired-attempts"]
    assert entry["task"] == "attempts.tasks.auto_submit_expired_attempts"
    assert entry["schedule"] == 60.0
    assert entry["options"]["queue"] == "default"
