"""T28 — server-authoritative practice pipeline (service-level tests)."""
from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from attempts.exceptions import (
    InvalidPracticeScopeError,
    NoPracticeQuestionsError,
)
from attempts.models import MockTest, MockTestQuestion
from attempts.services.attempt_services import (
    save_answer,
    start_attempt,
    submit_attempt,
)
from attempts.services.practice_services import create_practice_attempt
from questions.models import QuestionOption

from .factories import (
    ExamFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)


def _make_question(*, exam, subtopic, correct_label="A"):
    q = PublishedQuestionFactory(exam=exam, subtopic=subtopic, stem="Practice Q")
    for i, label in enumerate(["A", "B", "C", "D"]):
        QuestionOptionFactory(
            question=q,
            label=label,
            body=f"option {label}",
            is_correct=(label == correct_label),
            position=i + 1,
        )
    return q


@pytest.fixture
def hierarchy():
    """Exam with 2 subjects; A1=3 questions, A2=2, B1=4 (9 published total)."""
    exam = ExamFactory(code="PRX", name="Practice Exam", exam_type="qualifying")
    subj_a = SubjectFactory(exam=exam, name="Science", position=1)
    subj_b = SubjectFactory(exam=exam, name="Math", position=2)
    topic_a1 = TopicFactory(subject=subj_a, name="Physics", position=1)
    topic_a2 = TopicFactory(subject=subj_a, name="Chemistry", position=2)
    topic_b1 = TopicFactory(subject=subj_b, name="Algebra", position=1)
    st_a1 = SubtopicFactory(topic=topic_a1, name="Motion", position=1)
    st_a2 = SubtopicFactory(topic=topic_a2, name="Acids", position=1)
    st_b1 = SubtopicFactory(topic=topic_b1, name="Linear", position=1)
    for _ in range(3):
        _make_question(exam=exam, subtopic=st_a1)
    for _ in range(2):
        _make_question(exam=exam, subtopic=st_a2)
    for _ in range(4):
        _make_question(exam=exam, subtopic=st_b1)
    return {
        "exam": exam,
        "subj_a": subj_a,
        "subj_b": subj_b,
        "topic_a1": topic_a1,
        "st_a1": st_a1,
    }


# ── Selection logic ─────────────────────────────────────────────────────────


class TestSelection:
    def test_topic_scope_selects_only_topic_questions(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="topic",
            scope_id=hierarchy["topic_a1"].id,
        )
        mtqs = MockTestQuestion.objects.filter(
            mock_test_id=attempt.mock_test_id
        ).select_related("question__subtopic__topic")
        assert mtqs.count() == 3
        assert all(
            m.question.subtopic.topic_id == hierarchy["topic_a1"].id for m in mtqs
        )

    def test_subject_scope_spans_all_topics_of_subject(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="subject",
            scope_id=hierarchy["subj_a"].id,
        )
        mtqs = MockTestQuestion.objects.filter(
            mock_test_id=attempt.mock_test_id
        ).select_related("question__subtopic__topic__subject")
        assert mtqs.count() == 5  # A1 (3) + A2 (2)
        assert all(
            m.question.subtopic.topic.subject_id == hierarchy["subj_a"].id
            for m in mtqs
        )

    def test_mixed_scope_covers_whole_exam(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="mixed",
        )
        assert (
            MockTestQuestion.objects.filter(
                mock_test_id=attempt.mock_test_id
            ).count()
            == 9
        )

    def test_mixed_ignores_scope_id(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="mixed",
            scope_id=hierarchy["topic_a1"].id,  # ignored
        )
        mock_test = MockTest.objects.get(id=attempt.mock_test_id)
        assert mock_test.questions.count() == 9
        assert mock_test.config["scope_id"] is None


# ── Attempt + custom MockTest creation ──────────────────────────────────────


class TestAttemptCreation:
    def test_generates_custom_published_mock_test_with_config(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="topic",
            scope_id=hierarchy["topic_a1"].id,
        )
        mock_test = MockTest.objects.get(id=attempt.mock_test_id)
        assert mock_test.type == "custom"
        assert mock_test.is_published is True
        assert mock_test.total_questions == 3
        assert mock_test.config == {
            "source": "practice",
            "generated_for_user": str(user.id),
            "scope_type": "topic",
            "scope_id": str(hierarchy["topic_a1"].id),
        }

    def test_attempt_is_created_with_scope_type_and_mock_test(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="subject",
            scope_id=hierarchy["subj_a"].id,
        )
        assert attempt.attempt_type == "subject"
        assert attempt.mock_test_id is not None
        assert attempt.status == "created"
        assert attempt.user_id == user.id

    def test_mock_test_questions_have_positions_and_marks(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="topic",
            scope_id=hierarchy["topic_a1"].id,
        )
        mtqs = list(
            MockTestQuestion.objects.filter(
                mock_test_id=attempt.mock_test_id
            ).order_by("position")
        )
        assert [m.position for m in mtqs] == [1, 2, 3]
        assert all(m.marks == Decimal("1") for m in mtqs)
        assert all(m.section == "Science" for m in mtqs)


# ── Sparse pools and validation ─────────────────────────────────────────────


class TestSparseAndValidation:
    def test_sparse_pool_uses_actual_count(self, hierarchy):
        # topic_a1 has 3 published questions; target is 20.
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="topic",
            scope_id=hierarchy["topic_a1"].id,
        )
        mock_test = MockTest.objects.get(id=attempt.mock_test_id)
        assert mock_test.total_questions == 3

    def test_no_published_questions_raises(self, hierarchy):
        user = UserFactory()
        empty_topic = TopicFactory(
            subject=hierarchy["subj_a"], name="Empty", position=9
        )
        SubtopicFactory(topic=empty_topic, name="EmptySub", position=1)
        with pytest.raises(NoPracticeQuestionsError):
            create_practice_attempt(
                user_id=user.id,
                exam_id=hierarchy["exam"].id,
                scope_type="topic",
                scope_id=empty_topic.id,
            )

    def test_unknown_scope_type_raises(self, hierarchy):
        user = UserFactory()
        with pytest.raises(InvalidPracticeScopeError):
            create_practice_attempt(
                user_id=user.id,
                exam_id=hierarchy["exam"].id,
                scope_type="daily",
            )

    def test_topic_scope_requires_scope_id(self, hierarchy):
        user = UserFactory()
        with pytest.raises(InvalidPracticeScopeError):
            create_practice_attempt(
                user_id=user.id,
                exam_id=hierarchy["exam"].id,
                scope_type="topic",
                scope_id=None,
            )


# ── Player / scoring / analytics compatibility (full reuse) ─────────────────


class TestPipelineCompatibility:
    def test_start_sets_total_questions_like_a_mock(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="topic",
            scope_id=hierarchy["topic_a1"].id,
        )
        started = start_attempt(attempt_id=attempt.id)
        assert started.status == "in_progress"
        assert started.total_questions == 3
        assert started.duration_seconds == 900

    def _answer(self, attempt, mtq, *, correct):
        opt = QuestionOption.objects.filter(
            question=mtq.question, is_correct=correct
        ).first()
        save_answer(
            attempt_id=attempt.id,
            question_id=mtq.question_id,
            selected_option_id=opt.id,
            state="answered",
        )

    def test_scoring_reuses_existing_engine(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="topic",
            scope_id=hierarchy["topic_a1"].id,
        )
        start_attempt(attempt_id=attempt.id)
        mtqs = list(
            MockTestQuestion.objects.filter(
                mock_test_id=attempt.mock_test_id
            ).select_related("question")
        )
        self._answer(attempt, mtqs[0], correct=True)
        self._answer(attempt, mtqs[1], correct=True)
        self._answer(attempt, mtqs[2], correct=False)
        # mtqs[2] answered wrong; nothing skipped (all 3 answered).

        scored = submit_attempt(attempt_id=attempt.id)
        assert scored.status == "scored"
        assert scored.correct == 2
        assert scored.incorrect == 1
        assert scored.skipped == 0
        assert scored.score == Decimal("2")
        assert scored.max_score == Decimal("3")
        assert scored.accuracy == Decimal("66.67")

    def test_skipped_counts_unanswered(self, hierarchy):
        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="topic",
            scope_id=hierarchy["topic_a1"].id,
        )
        start_attempt(attempt_id=attempt.id)
        mtqs = list(
            MockTestQuestion.objects.filter(mock_test_id=attempt.mock_test_id)
            .select_related("question")
            .order_by("position")
        )
        self._answer(attempt, mtqs[0], correct=True)  # answer only 1 of 3
        scored = submit_attempt(attempt_id=attempt.id)
        assert scored.correct == 1
        assert scored.skipped == 2

    def test_analytics_engine_runs(self, hierarchy):
        from analytics.models import AttemptSectionAnalytics

        user = UserFactory()
        attempt = create_practice_attempt(
            user_id=user.id,
            exam_id=hierarchy["exam"].id,
            scope_type="subject",
            scope_id=hierarchy["subj_a"].id,
        )
        start_attempt(attempt_id=attempt.id)
        mtq = MockTestQuestion.objects.filter(
            mock_test_id=attempt.mock_test_id
        ).select_related("question").first()
        self._answer(attempt, mtq, correct=True)
        submit_attempt(attempt_id=attempt.id)
        assert AttemptSectionAnalytics.objects.filter(
            attempt_id=attempt.id
        ).exists()
