"""Factory tests for the attempts app."""
import pytest

from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer

from .factories import (
    ExamAttemptFactory,
    InProgressAttemptFactory,
    MockTestFactory,
    MockTestQuestionFactory,
    UnpublishedMockTestFactory,
    UserAnswerFactory,
)


class TestMockTestFactory:
    def test_creates_mock_test(self):
        mt = MockTestFactory()
        assert MockTest.objects.filter(id=mt.id).exists()
        assert mt.is_published is True
        assert mt.type == "system"

    def test_unpublished_trait(self):
        mt = UnpublishedMockTestFactory()
        assert mt.is_published is False


class TestMockTestQuestionFactory:
    def test_creates_mock_test_question(self):
        mtq = MockTestQuestionFactory()
        assert MockTestQuestion.objects.filter(id=mtq.id).exists()
        assert mtq.marks == 1


class TestExamAttemptFactory:
    def test_creates_attempt(self):
        attempt = ExamAttemptFactory()
        assert ExamAttempt.objects.filter(id=attempt.id).exists()
        assert attempt.status == "created"

    def test_in_progress_trait(self):
        attempt = InProgressAttemptFactory()
        assert attempt.status == "in_progress"
        assert attempt.started_at is not None


class TestUserAnswerFactory:
    def test_creates_answer(self):
        answer = UserAnswerFactory()
        assert UserAnswer.objects.filter(id=answer.id).exists()
        assert answer.state == "answered"
