"""Backfill ExamReadinessScore for existing scored attempts — T22.

Idempotent: computes the current readiness snapshot for every (user, exam) that
has at least one scored exam-type attempt. Re-running is a no-op for unchanged
inputs (the service dedups on score+band). Read-only except for the readiness
rows it creates; no scoring/analytics recomputation.
"""

from django.core.management.base import BaseCommand

from analytics.services.readiness_services import (
    EXAM_ATTEMPT_TYPES,
    compute_exam_readiness,
)
from attempts.models import ExamAttempt


class Command(BaseCommand):
    help = (
        "Backfill ExamReadinessScore for all users with scored exam-type "
        "attempts (idempotent)."
    )

    def handle(self, *args, **options):
        pairs = (
            ExamAttempt.objects.filter(
                status="scored", attempt_type__in=EXAM_ATTEMPT_TYPES
            )
            .values_list("user_id", "exam_id")
            .distinct()
        )

        written = 0
        provisional = 0
        for user_id, exam_id in pairs:
            row = compute_exam_readiness(user_id=user_id, exam_id=exam_id)
            if row is None:
                provisional += 1
            else:
                written += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Readiness backfill complete: {written} (user, exam) pair(s) "
                f"scored, {provisional} provisional/skipped."
            )
        )
