"""Service layer tests for the attempts app."""
import pytest
from django.db import transaction

from attempts.exceptions import (
    AttemptAlreadySubmittedError,
    InvalidAttemptTransitionError,
    MockTestNotFoundError,
    MockTestNotPublishedError,
    MockTestQuestionNotUniqueError,
)
from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer
from attempts.services.attempt_services import (
    add_question_to_mock_test,
    create_attempt,
    create_mock_test,
    delete_mock_test,
    remove_question_from_mock_test,
    save_answer,
    score_attempt,
    start_attempt,
    submit_attempt,
    update_mock_test,
)
from exams.exceptions import ExamNotFoundError
from questions.exceptions import QuestionNotFoundError

from .factories import (
    PublishedQuestionFactory,
    QuestionOptionFactory,
)


class TestCreateMockTest:
    def test_creates_mock_test(self, exam):
        mt = create_mock_test(
            exam_id=exam.id,
            name="CTET Full Mock",
            type="system",
            duration_seconds=7200,
            total_questions=150,
        )
        assert mt.name == "CTET Full Mock"
        assert mt.exam_id == exam.id
        assert mt.type == "system"

    def test_raises_error_for_missing_exam(self):
        with pytest.raises(ExamNotFoundError):
            create_mock_test(
                exam_id="00000000-0000-0000-0000-000000000000",
                name="Bad Mock",
                type="system",
                duration_seconds=3600,
                total_questions=50,
            )


class TestUpdateMockTest:
    def test_updates_name(self, mock_test):
        updated = update_mock_test(
            mock_test_id=mock_test.id, name="Updated Name"
        )
        assert updated.name == "Updated Name"

    def test_publishes_mock_test(self, mock_test):
        updated = update_mock_test(
            mock_test_id=mock_test.id, is_published=False
        )
        assert not updated.is_published


class TestDeleteMockTest:
    def test_deletes_mock_test(self, mock_test):
        delete_mock_test(mock_test_id=mock_test.id)
        assert not MockTest.objects.filter(id=mock_test.id).exists()

    def test_raises_error_for_missing(self):
        with pytest.raises(MockTestNotFoundError):
            delete_mock_test(
                mock_test_id="00000000-0000-0000-0000-000000000000"
            )


class TestAddQuestionToMockTest:
    def test_adds_question(self, mock_test, published_question):
        mtq = add_question_to_mock_test(
            mock_test_id=mock_test.id,
            question_id=published_question.id,
            position=1,
        )
        assert mtq.mock_test_id == mock_test.id
        assert mtq.question_id == published_question.id

    def test_raises_error_for_duplicate(
        self, mock_test, published_question
    ):
        add_question_to_mock_test(
            mock_test_id=mock_test.id,
            question_id=published_question.id,
            position=1,
        )
        with pytest.raises(MockTestQuestionNotUniqueError):
            add_question_to_mock_test(
                mock_test_id=mock_test.id,
                question_id=published_question.id,
                position=2,
            )


class TestCreateAttempt:
    def test_creates_attempt(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        assert attempt.status == "created"
        assert attempt.user_id == user.id
        assert attempt.exam_id == exam.id


class TestStartAttempt:
    def test_starts_attempt(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        started = start_attempt(attempt_id=attempt.id)
        assert started.status == "in_progress"
        assert started.started_at is not None

    def test_rejects_already_in_progress(self, attempt):
        with pytest.raises(InvalidAttemptTransitionError):
            start_attempt(attempt_id=attempt.id)


class TestSubmitAttempt:
    def test_submits_attempt(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        start_attempt(attempt_id=attempt.id)
        submitted = submit_attempt(attempt_id=attempt.id)
        assert submitted.status == "submitted"
        assert submitted.submitted_at is not None

    def test_submitted_sets_time_taken(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        import time as time_module
        start_attempt(attempt_id=attempt.id)
        submitted = submit_attempt(attempt_id=attempt.id)
        assert submitted.time_taken_seconds is not None


class TestScoreAttempt:
    def test_scores_attempt(self, attempt):
        submitted = submit_attempt(attempt_id=attempt.id)
        scored = score_attempt(attempt_id=attempt.id)
        assert scored.status == "scored"

    def test_scores_answer_counts(
        self, attempt, published_question
    ):
        save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="answered",
        )
        submit_attempt(attempt_id=attempt.id)
        scored = score_attempt(attempt_id=attempt.id)
        assert scored.correct >= 0


class TestSaveAnswer:
    def test_saves_answer(self, attempt, published_question):
        answer = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="answered",
            time_spent_seconds=30,
        )
        assert answer.attempt_id == attempt.id
        assert answer.question_id == published_question.id
        assert answer.time_spent_seconds == 30

    def test_rejects_submitted_attempt(
        self, attempt, published_question
    ):
        submit_attempt(attempt_id=attempt.id)
        with pytest.raises(AttemptAlreadySubmittedError):
            save_answer(
                attempt_id=attempt.id,
                question_id=published_question.id,
                state="answered",
            )

    def test_idempotent_save(self, attempt, published_question):
        a1 = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="answered",
        )
        a2 = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="marked",
        )
        assert a1.id == a2.id
        assert a2.state == "marked"

    def test_sets_correct_answer(
        self, attempt, published_question
    ):
        option = QuestionOptionFactory(
            question=published_question, is_correct=True
        )
        answer = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            selected_option_id=option.id,
            state="answered",
        )
        assert answer.is_correct is True

    def test_sets_incorrect_answer(
        self, attempt, published_question
    ):
        wrong = QuestionOptionFactory(
            question=published_question, is_correct=False
        )
        right = QuestionOptionFactory(
            question=published_question, is_correct=True
        )
        answer = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            selected_option_id=wrong.id,
            state="answered",
        )
        assert answer.is_correct is False


class TestMockTestNotPublished:
    def test_start_attempt_rejects_unpublished_mock(
        self, exam, user, unpublished_mock_test, published_question
    ):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
            mock_test_id=unpublished_mock_test.id,
        )
        with pytest.raises(MockTestNotPublishedError):
            start_attempt(attempt_id=attempt.id)
