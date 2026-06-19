"""Provision the single runnable CTET diagnostic mock test — CONTENT-HOTFIX-01.

Creates (idempotently) one published, system-type MockTest for CTET_P2_SCI,
maps ~25 deterministically-selected published questions (each with exactly one
correct option), and records the mock test id in Exam.blueprint via
read-modify-write. No schema/contract/scoring changes.

Audit-mandated rules:
  1. MockTest has no DB-unique column → logical idempotency on
     (exam, type="system", config.slug).
  2. Mapping idempotency is (mock_test, question), enforced by the
     add_question_to_mock_test service (skips an already-mapped question).
  3. total_questions is reconciled to the ACTUAL mapping count.
  4. Only published questions are mapped.
  5. Only questions with exactly one correct option qualify.

Run order: after seed_ctet + seed_questions (needs published questions).
"""

from collections import OrderedDict

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, Q

from attempts.exceptions import MockTestQuestionNotUniqueError
from attempts.models import MockTest
from attempts.services.attempt_services import (
    add_question_to_mock_test,
    create_mock_test,
    update_mock_test,
)
from exams.models import Exam
from questions.models import Question

# ── Diagnostic configuration ──────────────────────────────────────────────
# Kept local (small config, not bulk content) so the command is self-contained
# and importable under pytest without depending on the repo-root `data` tree.
EXAM_CODE = "CTET_P2_SCI"
# Logical idempotency key — MockTest has no DB-unique column (see audit).
# Looked up via filter(exam=..., type="system", config__slug=DIAGNOSTIC_SLUG).
DIAGNOSTIC_SLUG = "ctet_p2_sci_diagnostic"
DIAGNOSTIC_PURPOSE = "diagnostic"
DIAGNOSTIC_NAME = "CTET Paper II (Science) — Diagnostic Assessment"
DIAGNOSTIC_TYPE = "system"
# ~25 questions; 60s/question. start_attempt anchors the timer on this value.
DIAGNOSTIC_TARGET_QUESTIONS = 25
DIAGNOSTIC_DURATION_SECONDS = 1500


def _select_questions(exam, target):
    """Deterministic, subject-balanced selection of eligible questions.

    Eligible = published AND exactly one correct option. Ordered by subject
    position/name, then difficulty, then id (stable within a database), then
    distributed round-robin across subjects so coverage is balanced when the
    target cannot be met from a single subject.
    """
    eligible = (
        Question.objects.filter(exam=exam, review_status="published")
        .annotate(
            correct_count=Count("options", filter=Q(options__is_correct=True))
        )
        .filter(correct_count=1)
        .select_related("subtopic__topic__subject")
        .order_by(
            "subtopic__topic__subject__position",
            "subtopic__topic__subject__name",
            "difficulty",
            "id",
        )
    )

    # Bucket per subject, preserving the deterministic ordering above.
    buckets: "OrderedDict[str, list]" = OrderedDict()
    for question in eligible:
        subject = question.subtopic.topic.subject
        buckets.setdefault(str(subject.id), []).append(question)

    # Round-robin across subjects until we hit the target or exhaust the pool.
    selected: list = []
    while len(selected) < target:
        progressed = False
        for items in buckets.values():
            if not items:
                continue
            selected.append(items.pop(0))
            progressed = True
            if len(selected) >= target:
                break
        if not progressed:
            break
    return selected


class Command(BaseCommand):
    help = (
        "Provision the CTET diagnostic mock test (idempotent). "
        "Requires seed_ctet + seed_questions to have run."
    )

    def handle(self, *args, **options):
        try:
            exam = Exam.objects.get(code=EXAM_CODE)
        except Exam.DoesNotExist:
            raise CommandError(
                f"Exam {EXAM_CODE} not found. Run seed_ctet first."
            )

        selected = _select_questions(exam, DIAGNOSTIC_TARGET_QUESTIONS)
        if not selected:
            raise CommandError(
                "No eligible questions (published with exactly one correct "
                "option). Run seed_questions first."
            )

        config = {"slug": DIAGNOSTIC_SLUG, "purpose": DIAGNOSTIC_PURPOSE}

        # ── Logical find-or-create (no DB uniqueness on MockTest) ──
        mock_test = (
            MockTest.objects.filter(
                exam=exam, type=DIAGNOSTIC_TYPE, config__slug=DIAGNOSTIC_SLUG
            ).first()
        )
        if mock_test is None:
            mock_test = create_mock_test(
                exam_id=exam.id,
                name=DIAGNOSTIC_NAME,
                type=DIAGNOSTIC_TYPE,
                duration_seconds=DIAGNOSTIC_DURATION_SECONDS,
                total_questions=len(selected),
                config=config,
                is_published=True,
            )
            created = True
        else:
            created = False

        # ── Map questions idempotently (key: mock_test + question) ──
        newly_mapped = 0
        for position, question in enumerate(selected, start=1):
            try:
                add_question_to_mock_test(
                    mock_test_id=mock_test.id,
                    question_id=question.id,
                    position=position,
                    marks=1,
                )
                newly_mapped += 1
            except MockTestQuestionNotUniqueError:
                # Already mapped on a prior run — idempotent skip.
                continue

        # ── Reconcile total_questions to the ACTUAL mapping count; ensure
        #    the row stays published with the expected config. ──
        actual_count = mock_test.questions.count()
        update_mock_test(
            mock_test_id=mock_test.id,
            total_questions=actual_count,
            is_published=True,
            config=config,
        )

        # ── Blueprint read-modify-write (preserve existing keys) ──
        exam.refresh_from_db(fields=["blueprint"])
        blueprint = dict(exam.blueprint or {})
        blueprint["diagnostic_mock_test_id"] = str(mock_test.id)
        exam.blueprint = blueprint
        exam.save(update_fields=["blueprint"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Diagnostic mock test {'created' if created else 'updated'}: "
                f"{mock_test.id}\n"
                f"Eligible selected: {len(selected)} | "
                f"newly mapped: {newly_mapped} | "
                f"total mappings: {actual_count}\n"
                f"Exam.blueprint.diagnostic_mock_test_id = {mock_test.id}"
            )
        )
