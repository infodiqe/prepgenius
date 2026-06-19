"""Tests for the SPR1-CLOSEOUT-01 diagnostic readiness verification command."""

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from attempts.tests.factories import (
    MockTestFactory,
    MockTestQuestionFactory,
)
from exams.tests.factories import (
    ExamFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)
from questions.tests.factories import QuestionFactory, QuestionOptionFactory

EXAM_CODE = "CTET_P2_SCI"


def _published_question(exam):
    subject = SubjectFactory(exam=exam)
    topic = TopicFactory(subject=subject)
    subtopic = SubtopicFactory(topic=topic)
    q = QuestionFactory(exam=exam, subtopic=subtopic, review_status="published")
    QuestionOptionFactory(question=q, label="A", is_correct=True, position=0)
    QuestionOptionFactory(question=q, label="B", is_correct=False, position=1)
    return q


def _provision_ready_diagnostic(n=3):
    exam = ExamFactory(code=EXAM_CODE, is_active=True, blueprint={})
    mock = MockTestFactory(exam=exam, type="system", is_published=True, total_questions=n)
    for i in range(n):
        MockTestQuestionFactory(
            mock_test=mock, question=_published_question(exam), position=i + 1
        )
    exam.blueprint = {"diagnostic_mock_test_id": str(mock.id)}
    exam.save(update_fields=["blueprint"])
    return exam, mock


@pytest.mark.django_db
def test_passes_when_fully_configured():
    _provision_ready_diagnostic(n=3)
    # No exception ⇒ all checks passed.
    call_command("verify_diagnostic_readiness")


@pytest.mark.django_db
def test_fails_when_exam_missing():
    with pytest.raises(CommandError):
        call_command("verify_diagnostic_readiness")


@pytest.mark.django_db
def test_fails_when_blueprint_pointer_absent():
    exam = ExamFactory(code=EXAM_CODE, is_active=True, blueprint={})
    MockTestFactory(exam=exam, type="system", is_published=True)
    with pytest.raises(CommandError):
        call_command("verify_diagnostic_readiness")


@pytest.mark.django_db
def test_fails_when_mock_test_unpublished():
    exam = ExamFactory(code=EXAM_CODE, is_active=True, blueprint={})
    mock = MockTestFactory(exam=exam, type="system", is_published=False, total_questions=1)
    MockTestQuestionFactory(
        mock_test=mock, question=_published_question(exam), position=1
    )
    exam.blueprint = {"diagnostic_mock_test_id": str(mock.id)}
    exam.save(update_fields=["blueprint"])
    with pytest.raises(CommandError):
        call_command("verify_diagnostic_readiness")


@pytest.mark.django_db
def test_fails_when_a_mapped_question_is_unpublished():
    exam, mock = _provision_ready_diagnostic(n=2)
    # Add a draft (unpublished) mapped question → player would drop it.
    subject = SubjectFactory(exam=exam)
    topic = TopicFactory(subject=subject)
    subtopic = SubtopicFactory(topic=topic)
    draft = QuestionFactory(exam=exam, subtopic=subtopic, review_status="draft")
    QuestionOptionFactory(question=draft, label="A", is_correct=True, position=0)
    MockTestQuestionFactory(mock_test=mock, question=draft, position=99)
    # total_questions (2) now also mismatches the mapping count (3) — still fails.
    with pytest.raises(CommandError):
        call_command("verify_diagnostic_readiness")
