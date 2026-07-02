import pytest

from ai.enums import PromptType
from ai.exceptions import PromptNotRegisteredError, PromptRenderError
from ai.prompts import PROMPT_REGISTRY, PromptTemplate, get_prompt, render_prompt


class TestPromptRegistryParity:
    def test_every_prompt_type_is_registered(self):
        assert set(PROMPT_REGISTRY.keys()) == set(PromptType)

    def test_registry_entries_are_prompt_templates(self):
        for prompt_type, template in PROMPT_REGISTRY.items():
            assert isinstance(template, PromptTemplate)
            assert template.prompt_type == prompt_type
            assert template.system
            assert template.template


class TestGetPrompt:
    def test_get_by_enum(self):
        template = get_prompt(PromptType.QUESTION_HINT)
        assert template.prompt_type == PromptType.QUESTION_HINT

    def test_get_by_string_value(self):
        template = get_prompt("question_hint")
        assert template.prompt_type == PromptType.QUESTION_HINT

    def test_unknown_prompt_type_raises(self):
        with pytest.raises(PromptNotRegisteredError):
            get_prompt("not_a_real_prompt")


class TestRenderPrompt:
    def test_render_success(self):
        rendered = render_prompt(
            PromptType.QUESTION_TRANSLATION,
            {"content": "Water is H2O", "target_language": "Assamese"},
        )
        assert rendered.system
        assert "Assamese" in rendered.user
        assert "Water is H2O" in rendered.user

    def test_missing_required_var_raises(self):
        with pytest.raises(PromptRenderError):
            render_prompt(PromptType.QUESTION_TRANSLATION, {"content": "x"})

    def test_empty_required_var_is_treated_as_missing(self):
        with pytest.raises(PromptRenderError) as exc:
            render_prompt(PromptType.QUESTION_HINT, {"question": ""})
        assert "question" in str(exc.value)

    def test_optional_placeholder_renders_empty_when_absent(self):
        # QUESTION_GENERATION has optional {count}/{difficulty}; required exam/subject/topic.
        rendered = render_prompt(
            PromptType.QUESTION_GENERATION,
            {"exam": "CTET", "subject": "Maths", "topic": "Fractions"},
        )
        assert "CTET" in rendered.user
        # Missing optional vars do not raise; they render as empty strings.
        assert "None" not in rendered.user

    def test_malformed_template_raises_render_error(self):
        # A syntactically invalid format string (dangling brace) surfaces as a
        # PromptRenderError rather than a raw ValueError from str.format_map.
        template = PromptTemplate(
            prompt_type=PromptType.QUESTION_HINT,
            system="s",
            template="broken {",
        )
        with pytest.raises(PromptRenderError):
            template.render({})

    def test_all_prompts_render_with_common_payload(self):
        payload = {
            "exam": "CTET",
            "subject": "Maths",
            "topic": "Fractions",
            "difficulty": "medium",
            "count": 1,
            "question": "2+2=?",
            "answer": "4",
            "content": "hello",
            "target_language": "Hindi",
        }
        for prompt_type in PromptType:
            rendered = render_prompt(prompt_type, payload)
            assert rendered.user
