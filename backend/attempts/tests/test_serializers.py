"""Serializer tests for the attempts app."""
import pytest

from attempts.api.serializers import (
    ExamAttemptCreateSerializer,
    ExamAttemptReadSerializer,
    MockTestCreateSerializer,
    MockTestReadSerializer,
    MockTestQuestionCreateSerializer,
    MockTestQuestionReadSerializer,
    UserAnswerBulkSaveSerializer,
    UserAnswerReadSerializer,
    UserAnswerSaveSerializer,
)


class TestMockTestReadSerializer:
    def test_serializes(self, mock_test):
        serializer = MockTestReadSerializer(mock_test)
        assert str(serializer.data["id"]) == str(mock_test.id)
        assert serializer.data["name"] == mock_test.name
        assert "exam_id" in serializer.data


class TestMockTestCreateSerializer:
    def test_validates_required_fields(self):
        serializer = MockTestCreateSerializer(data={})
        assert not serializer.is_valid()

    def test_validates_valid_data(self, exam):
        data = {
            "exam_id": str(exam.id),
            "name": "New Mock",
            "type": "system",
            "duration_seconds": 3600,
            "total_questions": 100,
        }
        serializer = MockTestCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_type_choices(self):
        field = MockTestCreateSerializer().fields["type"]
        assert [c for c, *_ in field.choices] == [
            "system", "previous_year", "custom"
        ]


class TestMockTestQuestionReadSerializer:
    def test_serializes(self, mock_test_with_questions):
        mtq = mock_test_with_questions.questions.first()
        serializer = MockTestQuestionReadSerializer(mtq)
        assert str(serializer.data["id"]) == str(mtq.id)
        assert "mock_test_id" in serializer.data


class TestMockTestQuestionCreateSerializer:
    def test_validates_required_fields(self):
        serializer = MockTestQuestionCreateSerializer(data={})
        assert not serializer.is_valid()

    def test_validates_valid_data(self, mock_test, published_question):
        data = {
            "mock_test_id": str(mock_test.id),
            "question_id": str(published_question.id),
            "position": 1,
        }
        serializer = MockTestQuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors


class TestExamAttemptCreateSerializer:
    def test_validates_required_fields(self):
        serializer = ExamAttemptCreateSerializer(data={})
        assert not serializer.is_valid()

    def test_validates_valid_data(self, exam):
        data = {
            "exam_id": str(exam.id),
            "attempt_type": "full_mock",
        }
        serializer = ExamAttemptCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_attempt_type_choices(self):
        field = ExamAttemptCreateSerializer().fields["attempt_type"]
        assert [c for c, *_ in field.choices] == [
            "topic", "subject", "mixed",
            "previous_year", "full_mock", "daily"
        ]


class TestUserAnswerSaveSerializer:
    def test_validates_required_fields(self):
        serializer = UserAnswerSaveSerializer(data={})
        assert not serializer.is_valid()

    def test_validates_valid_data(self, published_question):
        data = {
            "question_id": str(published_question.id),
            "state": "answered",
        }
        serializer = UserAnswerSaveSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_default_state(self, published_question):
        data = {
            "question_id": str(published_question.id),
        }
        serializer = UserAnswerSaveSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["state"] == "answered"

    def test_state_choices(self):
        field = UserAnswerSaveSerializer().fields["state"]
        assert [c for c, *_ in field.choices] == [
            "not_visited", "visited", "answered",
            "marked", "answered_marked"
        ]


class TestUserAnswerBulkSaveSerializer:
    def test_validates_list(self):
        serializer = UserAnswerBulkSaveSerializer(data={})
        assert not serializer.is_valid()

    def test_validates_valid_list(self, published_question):
        data = {
            "answers": [
                {
                    "question_id": str(published_question.id),
                    "state": "answered",
                }
            ]
        }
        serializer = UserAnswerBulkSaveSerializer(data=data)
        assert serializer.is_valid(), serializer.errors


class TestUserAnswerReadSerializer:
    def test_serializes(self, attempt, published_question):
        from attempts.models import UserAnswer
        answer = UserAnswer.objects.create(
            attempt=attempt,
            question=published_question,
            state="answered",
        )
        serializer = UserAnswerReadSerializer(answer)
        assert str(serializer.data["id"]) == str(answer.id)
        assert serializer.data["state"] == "answered"
