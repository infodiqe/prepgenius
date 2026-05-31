import pytest
from uuid import UUID
from decimal import Decimal

pytestmark = pytest.mark.django_db


# ── Question Read ─────────────────────────────────────────────────────


class TestQuestionReadSerializer:
    def test_valid_data(self, question):
        from questions.serializers import QuestionReadSerializer

        serializer = QuestionReadSerializer(question)
        data = serializer.data

        assert data["id"] == str(question.id)
        assert data["exam_id"] == str(question.exam_id)
        assert data["subtopic_id"] == str(question.subtopic_id)
        assert data["stem"] == question.stem
        assert data["explanation"] == question.explanation
        assert data["difficulty"] == question.difficulty
        assert data["language"] == question.language
        assert data["origin"] == question.origin
        assert data["review_status"] == question.review_status
        assert data["verified_by_id"] is None
        assert data["tags"] == {}
        assert data["options"] == []

    def test_nested_options(self, question_with_options):
        from questions.serializers import QuestionReadSerializer

        q, _ = question_with_options
        q.refresh_from_db()
        serializer = QuestionReadSerializer(q)

        assert len(serializer.data["options"]) == 4
        for option_data in serializer.data["options"]:
            assert "id" in option_data
            assert "label" in option_data
            assert "body" in option_data
            assert "is_correct" in option_data
            assert "position" in option_data

    def test_does_not_expose_embedding(self, question):
        from questions.serializers import QuestionReadSerializer

        serializer = QuestionReadSerializer(question)
        assert "embedding" not in serializer.data

    def test_uuid_fields_are_strings(self, question):
        from questions.serializers import QuestionReadSerializer

        serializer = QuestionReadSerializer(question)
        assert isinstance(serializer.data["id"], str)
        assert isinstance(serializer.data["exam_id"], str)
        assert isinstance(serializer.data["subtopic_id"], str)


class TestQuestionReadSerializerNestedOptions:
    def test_individual_option_fields(self, question_with_options):
        from questions.serializers import QuestionOptionNestedSerializer

        _, options = question_with_options
        option = options[0]
        serializer = QuestionOptionNestedSerializer(option)

        assert serializer.data["id"] == str(option.id)
        assert serializer.data["label"] == option.label
        assert serializer.data["body"] == option.body
        assert serializer.data["is_correct"] == option.is_correct
        assert serializer.data["position"] == option.position

    def test_nested_serializer_omits_question_id(self, question_with_options):
        from questions.serializers import QuestionOptionNestedSerializer

        _, options = question_with_options
        option = options[0]
        serializer = QuestionOptionNestedSerializer(option)
        assert "question_id" not in serializer.data


# ── QuestionOption Read ───────────────────────────────────────────────


class TestQuestionOptionReadSerializer:
    def test_valid_data(self, question_with_options):
        from questions.serializers import QuestionOptionReadSerializer

        _, options = question_with_options
        option = options[0]
        serializer = QuestionOptionReadSerializer(option)
        data = serializer.data

        assert data["id"] == str(option.id)
        assert data["question_id"] == str(option.question_id)
        assert data["label"] == option.label
        assert data["body"] == option.body
        assert data["is_correct"] == option.is_correct
        assert data["position"] == option.position


# ── QuestionOption Create ─────────────────────────────────────────────


class TestQuestionOptionCreateSerializer:
    def test_valid_data(self, question):
        from questions.serializers import QuestionOptionCreateSerializer

        data = {
            "question_id": str(question.id),
            "label": "A",
            "body": "Option A body",
        }
        serializer = QuestionOptionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from questions.serializers import QuestionOptionCreateSerializer

        serializer = QuestionOptionCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "question_id" in serializer.errors
        assert "label" in serializer.errors
        assert "body" in serializer.errors

    def test_optional_fields_defaults(self, question):
        from questions.serializers import QuestionOptionCreateSerializer

        data = {
            "question_id": str(question.id),
            "label": "A",
            "body": "Option A body",
        }
        serializer = QuestionOptionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["is_correct"] is False
        assert serializer.validated_data["position"] == 0

    def test_invalid_uuid_returns_error(self):
        from questions.serializers import QuestionOptionCreateSerializer

        data = {
            "question_id": "not-a-uuid",
            "label": "A",
            "body": "Body",
        }
        serializer = QuestionOptionCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "question_id" in serializer.errors


# ── QuestionOption Update ─────────────────────────────────────────────


class TestQuestionOptionUpdateSerializer:
    def test_empty_data_is_valid(self):
        from questions.serializers import QuestionOptionUpdateSerializer

        serializer = QuestionOptionUpdateSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_partial_update(self, question_with_options):
        from questions.serializers import QuestionOptionUpdateSerializer

        _, options = question_with_options
        option = options[0]
        data = {"label": "E"}
        serializer = QuestionOptionUpdateSerializer(option, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["label"] == "E"
        assert "body" not in serializer.validated_data


# ── Question Create ───────────────────────────────────────────────────


class TestQuestionCreateSerializer:
    def test_valid_data(self, exam, subtopic):
        from questions.serializers import QuestionCreateSerializer

        data = {
            "exam_id": str(exam.id),
            "subtopic_id": str(subtopic.id),
            "stem": "What is Newton's first law?",
        }
        serializer = QuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from questions.serializers import QuestionCreateSerializer

        serializer = QuestionCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "exam_id" in serializer.errors
        assert "subtopic_id" in serializer.errors
        assert "stem" in serializer.errors

    def test_optional_fields_defaults(self, exam, subtopic):
        from questions.serializers import QuestionCreateSerializer

        data = {
            "exam_id": str(exam.id),
            "subtopic_id": str(subtopic.id),
            "stem": "What is Newton's first law?",
        }
        serializer = QuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["difficulty"] == 2
        assert serializer.validated_data["language"] == "as"
        assert serializer.validated_data["origin"] == "manual"

    def test_explanation_is_optional_and_nullable(self, exam, subtopic):
        from questions.serializers import QuestionCreateSerializer

        data = {
            "exam_id": str(exam.id),
            "subtopic_id": str(subtopic.id),
            "stem": "A question?",
            "explanation": None,
        }
        serializer = QuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data.get("explanation") is None

    def test_invalid_origin_choice(self, exam, subtopic):
        from questions.serializers import QuestionCreateSerializer

        data = {
            "exam_id": str(exam.id),
            "subtopic_id": str(subtopic.id),
            "stem": "A question?",
            "origin": "invalid_origin",
        }
        serializer = QuestionCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "origin" in serializer.errors


# ── Question Update ───────────────────────────────────────────────────


class TestQuestionUpdateSerializer:
    def test_empty_data_is_valid(self):
        from questions.serializers import QuestionUpdateSerializer

        serializer = QuestionUpdateSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_partial_update(self, question):
        from questions.serializers import QuestionUpdateSerializer

        data = {"stem": "Updated stem"}
        serializer = QuestionUpdateSerializer(question, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["stem"] == "Updated stem"
        assert "difficulty" not in serializer.validated_data

    def test_explanation_can_be_cleared(self, question):
        from questions.serializers import QuestionUpdateSerializer

        data = {"explanation": None}
        serializer = QuestionUpdateSerializer(question, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["explanation"] is None

    def test_subtopic_id_is_optional_uuid(self, question):
        from questions.serializers import QuestionUpdateSerializer

        data = {"subtopic_id": str(question.subtopic_id)}
        serializer = QuestionUpdateSerializer(question, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["subtopic_id"] == question.subtopic_id


# ── QuestionAppearance Read ───────────────────────────────────────────


class TestQuestionAppearanceReadSerializer:
    def test_valid_data(self, question_appearance):
        from questions.serializers import QuestionAppearanceReadSerializer

        serializer = QuestionAppearanceReadSerializer(question_appearance)
        data = serializer.data

        assert data["id"] == str(question_appearance.id)
        assert data["question_id"] == str(question_appearance.question_id)
        assert data["paper_id"] == str(question_appearance.paper_id)
        assert data["year"] == question_appearance.year


# ── QuestionAppearance Create ─────────────────────────────────────────


class TestQuestionAppearanceCreateSerializer:
    def test_valid_data(self, question, previous_year_paper):
        from questions.serializers import QuestionAppearanceCreateSerializer

        data = {
            "question_id": str(question.id),
            "paper_id": str(previous_year_paper.id),
            "year": 2024,
        }
        serializer = QuestionAppearanceCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from questions.serializers import QuestionAppearanceCreateSerializer

        serializer = QuestionAppearanceCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "question_id" in serializer.errors
        assert "paper_id" in serializer.errors
        assert "year" in serializer.errors


# ── QuestionAppearance Update ─────────────────────────────────────────


class TestQuestionAppearanceUpdateSerializer:
    def test_empty_data_is_valid(self):
        from questions.serializers import QuestionAppearanceUpdateSerializer

        serializer = QuestionAppearanceUpdateSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_partial_update(self, question_appearance):
        from questions.serializers import QuestionAppearanceUpdateSerializer

        data = {"year": 2025}
        serializer = QuestionAppearanceUpdateSerializer(
            question_appearance, data=data, partial=True
        )
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["year"] == 2025


# ── QuestionStat Read ─────────────────────────────────────────────────


class TestQuestionStatReadSerializer:
    def test_valid_data(self, question_stat):
        from questions.serializers import QuestionStatReadSerializer

        serializer = QuestionStatReadSerializer(question_stat)
        data = serializer.data

        assert data["question_id"] == str(question_stat.question_id)
        assert data["attempts"] == question_stat.attempts
        assert data["correct"] == question_stat.correct
        assert Decimal(data["success_rate"]) == question_stat.success_rate
        assert Decimal(data["avg_time_seconds"]) == question_stat.avg_time_seconds

    def test_uuid_field_is_string(self, question_stat):
        from questions.serializers import QuestionStatReadSerializer

        serializer = QuestionStatReadSerializer(question_stat)
        assert isinstance(serializer.data["question_id"], str)


# ── AiGeneratedQuestion Read ──────────────────────────────────────────


class TestAiGeneratedQuestionReadSerializer:
    def test_valid_data(self, ai_generated_question):
        from questions.serializers import AiGeneratedQuestionReadSerializer

        serializer = AiGeneratedQuestionReadSerializer(ai_generated_question)
        data = serializer.data

        assert data["id"] == str(ai_generated_question.id)
        assert data["exam_id"] == str(ai_generated_question.exam_id)
        assert data["model_used"] == ai_generated_question.model_used
        assert data["status"] == ai_generated_question.status
        assert data["resulting_question_id"] is None

    def test_does_not_expose_internal_fields(self, ai_generated_question):
        from questions.serializers import AiGeneratedQuestionReadSerializer

        serializer = AiGeneratedQuestionReadSerializer(ai_generated_question)
        assert "prompt" not in serializer.data
        assert "constraints_snapshot" not in serializer.data
        assert "raw_output" not in serializer.data
        assert "validation" not in serializer.data
        assert "credits_charged" not in serializer.data


# ── AiGeneratedQuestion Create ────────────────────────────────────────


class TestAiGeneratedQuestionCreateSerializer:
    def test_valid_data(self, exam):
        from questions.serializers import AiGeneratedQuestionCreateSerializer

        data = {
            "exam_id": str(exam.id),
            "model_used": "groq/llama-3.3-70b-versatile",
        }
        serializer = AiGeneratedQuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from questions.serializers import AiGeneratedQuestionCreateSerializer

        serializer = AiGeneratedQuestionCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "exam_id" in serializer.errors
        assert "model_used" in serializer.errors

    def test_optional_fields_defaults(self, exam):
        from questions.serializers import AiGeneratedQuestionCreateSerializer

        data = {
            "exam_id": str(exam.id),
            "model_used": "groq/llama-3.3-70b-versatile",
        }
        serializer = AiGeneratedQuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["credits_charged"] == 0

    def test_subtopic_id_is_optional_and_nullable(self, exam):
        from questions.serializers import AiGeneratedQuestionCreateSerializer

        data = {
            "exam_id": str(exam.id),
            "model_used": "openai/gpt-4o",
            "subtopic_id": None,
        }
        serializer = AiGeneratedQuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data.get("subtopic_id") is None

    def test_generation_batch_is_optional_uuid(self, exam):
        from questions.serializers import AiGeneratedQuestionCreateSerializer

        batch_uuid = "550e8400-e29b-41d4-a716-446655440000"
        data = {
            "exam_id": str(exam.id),
            "model_used": "groq/llama-3.3-70b-versatile",
            "generation_batch": batch_uuid,
        }
        serializer = AiGeneratedQuestionCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert str(serializer.validated_data["generation_batch"]) == batch_uuid

# ── AiGeneratedQuestion Update ────────────────────────────────────────


class TestAiGeneratedQuestionUpdateSerializer:
    def test_empty_data_is_valid(self):
        from questions.serializers import AiGeneratedQuestionUpdateSerializer

        serializer = AiGeneratedQuestionUpdateSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_partial_update(self, ai_generated_question):
        from questions.serializers import AiGeneratedQuestionUpdateSerializer

        data = {"status": "validated"}
        serializer = AiGeneratedQuestionUpdateSerializer(
            ai_generated_question, data=data, partial=True
        )
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["status"] == "validated"

    def test_subtopic_id_is_optional_nullable(self, ai_generated_question):
        from questions.serializers import AiGeneratedQuestionUpdateSerializer

        data = {"subtopic_id": None}
        serializer = AiGeneratedQuestionUpdateSerializer(
            ai_generated_question, data=data, partial=True
        )
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data.get("subtopic_id") is None


# ── Module-level import ───────────────────────────────────────────────


def test_all_serializers_importable():
    from questions.serializers import (
        AiGeneratedQuestionCreateSerializer,
        AiGeneratedQuestionReadSerializer,
        AiGeneratedQuestionUpdateSerializer,
        QuestionAppearanceCreateSerializer,
        QuestionAppearanceReadSerializer,
        QuestionAppearanceUpdateSerializer,
        QuestionCreateSerializer,
        QuestionOptionCreateSerializer,
        QuestionOptionNestedSerializer,
        QuestionOptionReadSerializer,
        QuestionOptionUpdateSerializer,
        QuestionReadSerializer,
        QuestionStatReadSerializer,
        QuestionUpdateSerializer,
    )
    assert QuestionReadSerializer is not None
    assert QuestionCreateSerializer is not None
    assert QuestionUpdateSerializer is not None
    assert QuestionOptionReadSerializer is not None
    assert QuestionOptionCreateSerializer is not None
    assert QuestionOptionUpdateSerializer is not None
    assert QuestionOptionNestedSerializer is not None
    assert QuestionAppearanceReadSerializer is not None
    assert QuestionAppearanceCreateSerializer is not None
    assert QuestionAppearanceUpdateSerializer is not None
    assert QuestionStatReadSerializer is not None
    assert AiGeneratedQuestionReadSerializer is not None
    assert AiGeneratedQuestionCreateSerializer is not None
    assert AiGeneratedQuestionUpdateSerializer is not None
