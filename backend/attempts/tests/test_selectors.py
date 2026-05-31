"""Selector tests for the attempts app."""
import pytest

from attempts.selectors.attempt_selectors import (
    get_exam_attempt_by_id,
    get_mock_test_by_id,
    get_mock_test_question_by_id,
    list_answers_for_attempt,
    list_attempts,
    list_mock_test_questions,
    list_mock_tests,
)


class TestGetMockTestById:
    def test_returns_mock_test(self, mock_test):
        result = get_mock_test_by_id(mock_test_id=mock_test.id)
        assert result.id == mock_test.id
        assert result.exam_id == mock_test.exam_id

    def test_raises_error_for_missing(self):
        from attempts.models import MockTest
        with pytest.raises(MockTest.DoesNotExist):
            get_mock_test_by_id(
                mock_test_id="00000000-0000-0000-0000-000000000000"
            )


class TestGetMockTestQuestionById:
    def test_returns_mtq(
        self, mock_test_with_questions
    ):
        mtq = mock_test_with_questions.questions.first()
        result = get_mock_test_question_by_id(
            mock_test_question_id=mtq.id
        )
        assert result.id == mtq.id
        assert result.mock_test_id == mock_test_with_questions.id


class TestGetExamAttemptById:
    def test_returns_attempt(self, attempt):
        result = get_exam_attempt_by_id(attempt_id=attempt.id)
        assert result.id == attempt.id

    def test_raises_error_for_missing(self):
        from attempts.models import ExamAttempt
        with pytest.raises(ExamAttempt.DoesNotExist):
            get_exam_attempt_by_id(
                attempt_id="00000000-0000-0000-0000-000000000000"
            )


class TestListMockTests:
    def test_lists_all(self, mock_test):
        results = list_mock_tests()
        assert len(results) >= 1

    def test_filters_by_exam(self, mock_test, exam):
        results = list_mock_tests(exam_id=exam.id)
        assert len(results) >= 1

    def test_filters_by_published(self, mock_test):
        results = list_mock_tests(is_published=True)
        assert len(results) >= 1

    def test_filters_by_unpublished(self, unpublished_mock_test):
        results = list_mock_tests(is_published=False)
        assert len(results) >= 1


class TestListMockTestQuestions:
    def test_lists_questions(
        self, mock_test_with_questions
    ):
        results = list_mock_test_questions(
            mock_test_id=mock_test_with_questions.id
        )
        assert len(results) == mock_test_with_questions.total_questions

    def test_returns_empty_for_empty_mock_test(self, mock_test):
        results = list_mock_test_questions(
            mock_test_id=mock_test.id
        )
        assert len(results) == 0


class TestListAttempts:
    def test_lists_by_user(self, attempt):
        results = list_attempts(user_id=attempt.user_id)
        assert len(results) >= 1

    def test_filters_by_status(self, attempt):
        results = list_attempts(status="in_progress")
        assert len(results) >= 1

    def test_filters_by_exam(self, attempt, exam):
        results = list_attempts(exam_id=exam.id)
        assert len(results) >= 1


class TestListAnswersForAttempt:
    def test_lists_answers(self, attempt, published_question):
        from attempts.models import UserAnswer
        UserAnswer.objects.create(
            attempt=attempt,
            question=published_question,
            state="answered",
        )
        results = list_answers_for_attempt(attempt_id=attempt.id)
        assert len(results) == 1
