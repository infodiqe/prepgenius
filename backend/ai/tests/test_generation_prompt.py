from ai.enums import PromptType
from ai.prompts import get_prompt, render_prompt


class TestQuestionGenerationPrompt:
    def test_registered_and_json_only(self):
        template = get_prompt(PromptType.QUESTION_GENERATION)
        assert "JSON" in template.system
        # No markdown / prose leakage instruction present.
        assert "markdown" in template.system.lower()

    def test_renders_full_payload(self):
        rendered = render_prompt(
            PromptType.QUESTION_GENERATION,
            {
                "exam": "CTET",
                "subject": "Maths",
                "topic": "Fractions",
                "subtopic": "Proper Fractions",
                "difficulty": "medium",
                "bloom_level": "apply",
                "question_type": "single_correct",
                "language": "Assamese",
                "count": 3,
                "additional_instructions": "keep it concise",
            },
        )
        assert "CTET" in rendered.user
        assert "Assamese" in rendered.user
        assert "single_correct" in rendered.user
        assert "questions" in rendered.user
        # Schema keys are described for the model.
        assert "correct_answer" in rendered.user
        assert "explanation" in rendered.user
        assert "confidence_score" in rendered.user

    def test_renders_without_optional_vars(self):
        # subtopic / additional_instructions omitted → renders empty, never errors.
        rendered = render_prompt(
            PromptType.QUESTION_GENERATION,
            {"exam": "CTET", "subject": "Maths", "topic": "Fractions"},
        )
        assert "CTET" in rendered.user
        assert "None" not in rendered.user
