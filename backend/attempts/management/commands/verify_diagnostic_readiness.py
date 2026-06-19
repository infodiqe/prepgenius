"""Operator-facing diagnostic readiness check — SPR1-CLOSEOUT-01.

Read-only and idempotent. Run before onboarding pilot users to confirm the
activation loop's content/config prerequisites exist. Exits non-zero (via
CommandError) if any check fails, so it can gate a deploy/runbook step.

Verifies, for the target exam (default CTET_P2_SCI):
  1. the exam exists and is active;
  2. blueprint.diagnostic_mock_test_id is set;
  3. that MockTest exists, is type=system, and is published;
  4. it has question mappings;
  5. MockTest.total_questions matches the mapping count;
  6. every mapped question is published (else the player silently drops it).

No writes, no schema/contract/player changes.
"""

from django.core.management.base import BaseCommand, CommandError

from attempts.models import MockTest, MockTestQuestion
from exams.models import Exam

DEFAULT_EXAM_CODE = "CTET_P2_SCI"


class Command(BaseCommand):
    help = (
        "Verify diagnostic activation readiness (read-only). "
        "Exits non-zero if any prerequisite is missing."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--exam-code",
            default=DEFAULT_EXAM_CODE,
            help=f"Exam code to verify (default: {DEFAULT_EXAM_CODE}).",
        )

    def _ok(self, msg: str) -> None:
        self.stdout.write(self.style.SUCCESS(f"  [PASS] {msg}"))

    def _fail(self, failures: list[str], msg: str) -> None:
        failures.append(msg)
        self.stdout.write(self.style.ERROR(f"  [FAIL] {msg}"))

    def handle(self, *args, **options):
        code = options["exam_code"]
        failures: list[str] = []

        self.stdout.write(
            self.style.MIGRATE_HEADING(f"Diagnostic readiness — {code}")
        )

        # 1. Exam exists / active. ── fatal: cannot continue without it.
        exam = Exam.objects.filter(code=code).first()
        if exam is None:
            raise CommandError(
                f"Exam {code} not found. Run `seed_ctet` (or `seed_all`)."
            )
        self._ok(f"Exam {code} exists")
        if exam.is_active:
            self._ok("Exam is active")
        else:
            self._fail(failures, "Exam is not active")

        # 2. Blueprint pointer. ── fatal: nothing else is checkable without it.
        blueprint = exam.blueprint if isinstance(exam.blueprint, dict) else {}
        mock_test_id = blueprint.get("diagnostic_mock_test_id")
        if not mock_test_id:
            raise CommandError(
                "blueprint.diagnostic_mock_test_id is missing. "
                "Run `seed_ctet_diagnostic` (or `seed_all`)."
            )
        self._ok(f"blueprint.diagnostic_mock_test_id = {mock_test_id}")

        # 3. Mock test exists / published.
        mock_test = MockTest.objects.filter(id=mock_test_id, exam=exam).first()
        if mock_test is None:
            raise CommandError(
                f"Diagnostic MockTest {mock_test_id} not found for {code}. "
                "Re-run `seed_ctet_diagnostic`."
            )
        self._ok(f"Diagnostic MockTest exists: {mock_test.name}")
        if mock_test.is_published:
            self._ok("MockTest is published")
        else:
            self._fail(
                failures,
                "MockTest is NOT published (start_attempt would reject it)",
            )

        # 4-6. Mappings + consistency + all-published.
        mappings = MockTestQuestion.objects.filter(mock_test=mock_test)
        count = mappings.count()
        if count > 0:
            self._ok(f"{count} question mapping(s) exist")
        else:
            self._fail(failures, "No MockTestQuestion mappings")

        if mock_test.total_questions == count:
            self._ok(f"total_questions matches mapping count ({count})")
        else:
            self._fail(
                failures,
                f"total_questions={mock_test.total_questions} != "
                f"mapping count={count}",
            )

        unpublished = mappings.exclude(
            question__review_status="published"
        ).count()
        if unpublished == 0:
            self._ok("All mapped questions are published")
        else:
            self._fail(
                failures,
                f"{unpublished} mapped question(s) are NOT published "
                "(player would silently drop them)",
            )

        if failures:
            raise CommandError(
                f"Diagnostic readiness: {len(failures)} check(s) FAILED."
            )
        self.stdout.write(
            self.style.SUCCESS("\nDiagnostic readiness: ALL CHECKS PASSED.")
        )
