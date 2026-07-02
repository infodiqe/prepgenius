from ai.generation.dto import (
    GeneratedQuestion,
    QuestionGenerationResponse,
    QuestionOption,
)


def _question(**over):
    defaults = dict(
        stem="s",
        options=[QuestionOption("A", "a", False), QuestionOption("B", "b", True)],
        correct_answer="B",
        explanation="e",
        difficulty="easy",
        bloom_level="remember",
        estimated_time_seconds=30,
        tags=["t"],
        learning_objective="lo",
        language="en",
        question_type="single_correct",
    )
    defaults.update(over)
    return GeneratedQuestion(**defaults)


class TestDtoSerialization:
    def test_option_to_dict(self):
        assert QuestionOption("A", "text", True).to_dict() == {
            "label": "A",
            "text": "text",
            "is_correct": True,
        }

    def test_question_to_dict_defaults_source_ai(self):
        d = _question().to_dict()
        assert d["source"] == "ai"
        assert d["confidence_score"] is None
        assert d["options"][1]["is_correct"] is True
        assert d["question_type"] == "single_correct"

    def test_response_count_and_to_dict(self):
        resp = QuestionGenerationResponse(
            questions=[_question(), _question()],
            provider="mock",
            model="m",
            request_id="r",
        )
        assert resp.count == 2
        d = resp.to_dict()
        assert d["count"] == 2
        assert d["provider"] == "mock"
        assert len(d["questions"]) == 2

    def test_empty_response_count_zero(self):
        assert QuestionGenerationResponse(questions=[]).count == 0
