"""Server-authoritative practice pipeline — T28 (Option A).

Topic / Subject / Mixed practice reuses the *entire* mock-test machinery: a
per-session ``custom`` MockTest is generated containing a server-selected set of
published questions for the scope. Because the resulting attempt carries a real
``mock_test_id``, the existing player, scoring, analytics, readiness, history and
trends flows all work unchanged — no scoring/analytics code is touched.

Metadata is stored on ``MockTest.config``:
    {
      "source": "practice",
      "generated_for_user": "<user_id>",
      "scope_type": "topic|subject|mixed",
      "scope_id": "<uuid|null>",
    }
"""
from decimal import Decimal
from uuid import UUID

from django.db import transaction

from attempts.exceptions import (
    InvalidPracticeScopeError,
    NoPracticeQuestionsError,
)
from attempts.models import ExamAttempt, MockTestQuestion
from attempts.services.attempt_services import create_attempt, create_mock_test
from exams.exceptions import ExamNotFoundError
from exams.models import Exam
from exams.selectors.exam_selectors import get_exam_by_id
from questions.models import Question

# Default question counts (requirement #7); the actual set may be smaller when
# fewer published questions exist (requirement #8).
PRACTICE_TARGET_COUNTS = {"topic": 20, "subject": 30, "mixed": 50}
PRACTICE_DURATIONS_SECONDS = {"topic": 900, "subject": 1500, "mixed": 2400}
PRACTICE_NAMES = {
    "topic": "Topic Practice",
    "subject": "Subject Practice",
    "mixed": "Mixed Practice",
}
_PRACTICE_MARKS = Decimal("1")
_SCOPED_TYPES = ("topic", "subject")


def _select_practice_questions(
    *, exam_id: UUID, scope_type: str, scope_id: UUID | None, limit: int
) -> list[Question]:
    """Select up to ``limit`` published questions for the scope (server-side)."""
    qs = Question.objects.filter(exam_id=exam_id, review_status="published")
    if scope_type == "topic":
        qs = qs.filter(subtopic__topic_id=scope_id)
    elif scope_type == "subject":
        qs = qs.filter(subtopic__topic__subject_id=scope_id)
    # "mixed" → the whole exam, no further filter.
    qs = qs.select_related("subtopic__topic__subject").order_by("?")[:limit]
    return list(qs)


def _section_for(question: Question) -> str | None:
    """Group a question by its subject name (used for section analytics/tabs)."""
    subtopic = question.subtopic
    if subtopic and subtopic.topic and subtopic.topic.subject:
        return subtopic.topic.subject.name
    return None


def create_practice_attempt(
    *,
    user_id: UUID,
    exam_id: UUID,
    scope_type: str,
    scope_id: UUID | None = None,
) -> ExamAttempt:
    """Create a Topic/Subject/Mixed practice attempt backed by a custom MockTest."""
    if scope_type not in PRACTICE_TARGET_COUNTS:
        raise InvalidPracticeScopeError(scope_type, reason="unknown scope_type")
    if scope_type in _SCOPED_TYPES and scope_id is None:
        raise InvalidPracticeScopeError(scope_type, reason="scope_id is required")

    try:
        get_exam_by_id(exam_id=exam_id)
    except Exam.DoesNotExist:
        raise ExamNotFoundError(str(exam_id))

    # scope_id is meaningful only for topic/subject; ignored for mixed.
    effective_scope_id = scope_id if scope_type in _SCOPED_TYPES else None
    limit = PRACTICE_TARGET_COUNTS[scope_type]

    questions = _select_practice_questions(
        exam_id=exam_id,
        scope_type=scope_type,
        scope_id=effective_scope_id,
        limit=limit,
    )
    if not questions:
        raise NoPracticeQuestionsError(
            scope_type,
            str(effective_scope_id) if effective_scope_id else None,
        )

    with transaction.atomic():
        mock_test = create_mock_test(
            exam_id=exam_id,
            name=PRACTICE_NAMES[scope_type],
            type="custom",
            duration_seconds=PRACTICE_DURATIONS_SECONDS[scope_type],
            total_questions=len(questions),
            created_by_id=user_id,
            config={
                "source": "practice",
                "generated_for_user": str(user_id),
                "scope_type": scope_type,
                "scope_id": str(effective_scope_id) if effective_scope_id else None,
            },
            is_published=True,
        )
        MockTestQuestion.objects.bulk_create(
            [
                MockTestQuestion(
                    mock_test=mock_test,
                    question=question,
                    position=index + 1,
                    section=_section_for(question),
                    marks=_PRACTICE_MARKS,
                )
                for index, question in enumerate(questions)
            ]
        )
        attempt = create_attempt(
            user_id=user_id,
            exam_id=exam_id,
            attempt_type=scope_type,
            mock_test_id=mock_test.id,
            duration_seconds=PRACTICE_DURATIONS_SECONDS[scope_type],
        )

    return attempt
