"""Tests for the CONTENT-HOTFIX-01 CTET diagnostic seed command."""

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from attempts.models import MockTest, MockTestQuestion
from attempts.management.commands.seed_ctet_diagnostic import (
    DIAGNOSTIC_DURATION_SECONDS,
    DIAGNOSTIC_PURPOSE,
    DIAGNOSTIC_SLUG,
    DIAGNOSTIC_TYPE,
)
from exams.tests.factories import (
    ExamFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)
from questions.tests.factories import QuestionFactory, QuestionOptionFactory

EXAM_CODE = "CTET_P2_SCI"


def _make_question(exam, subtopic, *, review_status="published", n_correct=1, n_options=4):
    q = QuestionFactory(exam=exam, subtopic=subtopic, review_status=review_status)
    for i in range(n_options):
        QuestionOptionFactory(
            question=q,
            label=chr(65 + i),
            is_correct=(i < n_correct),
            position=i,
        )
    return q


def _make_subject_with_subtopic(exam):
    subject = SubjectFactory(exam=exam)
    topic = TopicFactory(subject=subject)
    return SubtopicFactory(topic=topic)


def _diagnostic_qs(exam):
    return MockTest.objects.filter(
        exam=exam, type=DIAGNOSTIC_TYPE, config__slug=DIAGNOSTIC_SLUG
    )


@pytest.fixture
def ctet_exam(db):
    # Pre-populate blueprint to prove read-modify-write preserves keys.
    exam = ExamFactory(code=EXAM_CODE, blueprint={"existing_key": "keep_me"})
    return exam


@pytest.fixture
def seeded_pool(ctet_exam):
    """3 subjects × 10 eligible published questions (30 total), plus
    ineligible decoys that must never be mapped."""
    exam = ctet_exam
    eligible = []
    for _ in range(3):
        subtopic = _make_subject_with_subtopic(exam)
        for _ in range(10):
            eligible.append(_make_question(exam, subtopic))
    # Decoys on a fourth subject.
    decoy_sub = _make_subject_with_subtopic(exam)
    unpublished = _make_question(exam, decoy_sub, review_status="draft")
    zero_correct = _make_question(exam, decoy_sub, n_correct=0)
    two_correct = _make_question(exam, decoy_sub, n_correct=2)
    return {
        "exam": exam,
        "eligible": eligible,
        "decoys": {unpublished.id, zero_correct.id, two_correct.id},
    }


@pytest.mark.django_db
def test_creates_published_system_diagnostic(seeded_pool):
    exam = seeded_pool["exam"]
    call_command("seed_ctet_diagnostic")

    qs = _diagnostic_qs(exam)
    assert qs.count() == 1
    mock = qs.first()
    assert mock.is_published is True
    assert mock.type == DIAGNOSTIC_TYPE
    assert mock.config["purpose"] == DIAGNOSTIC_PURPOSE
    assert mock.duration_seconds == DIAGNOSTIC_DURATION_SECONDS


@pytest.mark.django_db
def test_maps_25_and_total_questions_matches_count(seeded_pool):
    call_command("seed_ctet_diagnostic")
    mock = _diagnostic_qs(seeded_pool["exam"]).first()

    mappings = MockTestQuestion.objects.filter(mock_test=mock)
    assert mappings.count() == 25  # capped at target with 30 eligible
    assert mock.total_questions == mappings.count()
    # Contiguous positions 1..25.
    positions = sorted(m.position for m in mappings)
    assert positions == list(range(1, 26))


@pytest.mark.django_db
def test_only_eligible_questions_are_mapped(seeded_pool):
    call_command("seed_ctet_diagnostic")
    mock = _diagnostic_qs(seeded_pool["exam"]).first()

    mapped = MockTestQuestion.objects.filter(mock_test=mock).select_related("question")
    decoys = seeded_pool["decoys"]
    for m in mapped:
        # never a decoy (unpublished / 0-correct / 2-correct)
        assert m.question_id not in decoys
        # published with exactly one correct option
        assert m.question.review_status == "published"
        assert m.question.options.filter(is_correct=True).count() == 1


@pytest.mark.django_db
def test_balanced_across_subjects(seeded_pool):
    call_command("seed_ctet_diagnostic")
    mock = _diagnostic_qs(seeded_pool["exam"]).first()
    mapped = MockTestQuestion.objects.filter(mock_test=mock).select_related(
        "question__subtopic__topic__subject"
    )
    per_subject: dict = {}
    for m in mapped:
        sid = m.question.subtopic.topic.subject_id
        per_subject[sid] = per_subject.get(sid, 0) + 1
    # 25 across 3 eligible subjects → round-robin 9/8/8.
    assert sorted(per_subject.values()) == [8, 8, 9]


@pytest.mark.django_db
def test_blueprint_updated_and_preserves_existing_keys(seeded_pool):
    exam = seeded_pool["exam"]
    call_command("seed_ctet_diagnostic")
    mock = _diagnostic_qs(exam).first()

    exam.refresh_from_db()
    assert exam.blueprint["diagnostic_mock_test_id"] == str(mock.id)
    assert exam.blueprint["existing_key"] == "keep_me"


@pytest.mark.django_db
def test_idempotent_rerun_creates_no_duplicates(seeded_pool):
    exam = seeded_pool["exam"]
    call_command("seed_ctet_diagnostic")
    call_command("seed_ctet_diagnostic")
    call_command("seed_ctet_diagnostic")

    assert _diagnostic_qs(exam).count() == 1
    mock = _diagnostic_qs(exam).first()
    assert MockTestQuestion.objects.filter(mock_test=mock).count() == 25
    assert mock.total_questions == 25
    # blueprint still points at the one mock test
    exam.refresh_from_db()
    assert exam.blueprint["diagnostic_mock_test_id"] == str(mock.id)


@pytest.mark.django_db
def test_uses_all_qualifying_when_fewer_than_target(ctet_exam):
    exam = ctet_exam
    subtopic = _make_subject_with_subtopic(exam)
    for _ in range(5):
        _make_question(exam, subtopic)

    call_command("seed_ctet_diagnostic")
    mock = _diagnostic_qs(exam).first()
    assert MockTestQuestion.objects.filter(mock_test=mock).count() == 5
    assert mock.total_questions == 5


@pytest.mark.django_db
def test_errors_when_exam_missing(db):
    with pytest.raises(CommandError):
        call_command("seed_ctet_diagnostic")


@pytest.mark.django_db
def test_errors_when_no_eligible_questions(ctet_exam):
    # Exam exists but only ineligible questions.
    subtopic = _make_subject_with_subtopic(ctet_exam)
    _make_question(ctet_exam, subtopic, review_status="draft")
    _make_question(ctet_exam, subtopic, n_correct=0)
    with pytest.raises(CommandError):
        call_command("seed_ctet_diagnostic")
