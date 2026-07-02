import json

import pytest

from ai.enums import PromptType
from ai.generation.enums import MAX_QUESTIONS_PER_REQUEST
from ai.generation.exceptions import (
    EmptyGenerationResponseError,
    GenerationTimeoutError,
    InvalidGenerationRequestError,
    InvalidGenerationResponseError,
    ProviderUnavailableError,
    UnsupportedLanguageError,
    UnsupportedQuestionTypeError,
)
from ai.generation.service import QuestionGenerationService
from ai.tests.generation_utils import (
    StubGenerate,
    make_request,
    make_result,
    question_dict,
    valid_json,
)


def _service(result):
    stub = StubGenerate(result)
    return QuestionGenerationService(generate_fn=stub), stub


class TestSuccessMapping:
    def test_maps_valid_response(self):
        service, stub = _service(make_result(text=valid_json(count=2)))
        resp = service.generate(make_request(count=2))
        assert resp.count == 2
        assert resp.provider == "mock"
        assert resp.model == "mock-model"
        assert resp.request_id == "req-123"
        q = resp.questions[0]
        assert q.stem == "What is 1/2 + 1/2?"
        assert q.correct_answer == "B"
        assert q.source == "ai"
        assert q.question_type == "single_correct"
        assert len(q.options) == 4
        assert q.options[1].is_correct is True
        assert q.confidence_score == 0.92

    def test_strips_markdown_code_fences(self):
        fenced = f"```json\n{valid_json()}\n```"
        service, _ = _service(make_result(text=fenced))
        resp = service.generate(make_request())
        assert resp.count == 1

    def test_accepts_top_level_list(self):
        service, _ = _service(make_result(text=json.dumps([question_dict()])))
        resp = service.generate(make_request())
        assert resp.count == 1

    def test_correct_answer_derived_from_is_correct_when_absent(self):
        q = question_dict()
        q.pop("correct_answer")
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        resp = service.generate(make_request())
        assert resp.questions[0].correct_answer == "B"

    def test_defaults_backfilled_from_request(self):
        q = question_dict()
        for key in ("difficulty", "bloom_level", "language"):
            q.pop(key)
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        resp = service.generate(make_request(difficulty="hard", bloom_level="analyze", language="hi"))
        assert resp.questions[0].difficulty == "hard"
        assert resp.questions[0].bloom_level == "analyze"
        assert resp.questions[0].language == "hi"

    def test_coercions(self):
        q = question_dict(estimated_time_seconds="oops", tags="notalist", confidence_score="bad")
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        resp = service.generate(make_request())
        assert resp.questions[0].estimated_time_seconds == 60  # default
        assert resp.questions[0].tags == []
        assert resp.questions[0].confidence_score is None

    def test_option_label_defaulted_when_missing(self):
        q = question_dict(
            options=[
                {"text": "x", "is_correct": True},
                {"text": "y", "is_correct": False},
            ]
        )
        q.pop("correct_answer")
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        resp = service.generate(make_request())
        assert resp.questions[0].options[0].label == "A"
        assert resp.questions[0].correct_answer == "A"


class TestGatewayInvocation:
    def test_passes_prompt_type_payload_and_user(self):
        service, stub = _service(make_result(text=valid_json()))
        service.generate(
            make_request(subtopic="Proper Fractions", additional_instructions="be concise", language="as"),
            created_by="user-obj",
        )
        call = stub.last_call
        assert call["prompt_type"] == PromptType.QUESTION_GENERATION
        assert call["created_by"] == "user-obj"
        payload = call["payload"]
        assert payload["exam"] == "CTET"
        assert payload["subtopic"] == "Proper Fractions"
        assert payload["additional_instructions"] == "be concise"
        assert payload["language"] == "Assamese"  # display name, not code

    def test_optional_fields_default_in_payload(self):
        service, stub = _service(make_result(text=valid_json()))
        service.generate(make_request(subtopic=None, additional_instructions=None))
        payload = stub.last_call["payload"]
        assert payload["subtopic"] == "not specified"
        assert payload["additional_instructions"] == "none"


class TestRequestValidation:
    @pytest.mark.parametrize("field", ["exam", "subject", "topic"])
    def test_blank_required_field(self, field):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(InvalidGenerationRequestError):
            service.generate(make_request(**{field: "  "}))

    def test_unknown_question_type(self):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(UnsupportedQuestionTypeError):
            service.generate(make_request(question_type="banana"))

    def test_declared_but_unsupported_question_type(self):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(UnsupportedQuestionTypeError):
            service.generate(make_request(question_type="multi_correct"))

    def test_unsupported_language(self):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(UnsupportedLanguageError):
            service.generate(make_request(language="fr"))

    def test_invalid_difficulty(self):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(InvalidGenerationRequestError):
            service.generate(make_request(difficulty="impossible"))

    def test_invalid_bloom(self):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(InvalidGenerationRequestError):
            service.generate(make_request(bloom_level="wizardry"))

    def test_count_too_low(self):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(InvalidGenerationRequestError):
            service.generate(make_request(count=0))

    def test_count_too_high(self):
        service, _ = _service(make_result(text=valid_json()))
        with pytest.raises(InvalidGenerationRequestError):
            service.generate(make_request(count=MAX_QUESTIONS_PER_REQUEST + 1))


class TestProviderFailures:
    def test_provider_unavailable(self):
        service, _ = _service(make_result(success=False, error="all providers failed"))
        with pytest.raises(ProviderUnavailableError):
            service.generate(make_request())

    def test_timeout_detected_from_error(self):
        service, _ = _service(make_result(success=False, error="groq timed out after 30s"))
        with pytest.raises(GenerationTimeoutError):
            service.generate(make_request())

    def test_empty_text(self):
        service, _ = _service(make_result(text="   "))
        with pytest.raises(EmptyGenerationResponseError):
            service.generate(make_request())

    def test_empty_questions_array(self):
        service, _ = _service(make_result(text=json.dumps({"questions": []})))
        with pytest.raises(EmptyGenerationResponseError):
            service.generate(make_request())


class TestResponseValidation:
    def test_invalid_json(self):
        service, _ = _service(make_result(text="not json {"))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_json_not_object_or_array(self):
        service, _ = _service(make_result(text="42"))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_questions_not_a_list(self):
        service, _ = _service(make_result(text=json.dumps({"questions": {"a": 1}})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_question_not_object(self):
        service, _ = _service(make_result(text=json.dumps({"questions": ["oops"]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_missing_stem(self):
        q = question_dict(stem="")
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_options_not_list(self):
        q = question_dict(options="nope")
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_too_few_options(self):
        q = question_dict(options=[{"label": "A", "text": "x", "is_correct": True}])
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_option_not_object(self):
        q = question_dict(options=["a", "b"])
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_option_missing_text(self):
        q = question_dict(
            options=[
                {"label": "A", "text": "", "is_correct": True},
                {"label": "B", "text": "y", "is_correct": False},
            ]
        )
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_no_resolvable_correct_answer(self):
        q = question_dict(
            correct_answer="Z",  # not a real label
            options=[
                {"label": "A", "text": "x", "is_correct": False},
                {"label": "B", "text": "y", "is_correct": False},
            ],
        )
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())

    def test_multiple_correct_flags_are_rejected(self):
        q = question_dict(
            correct_answer="",
            options=[
                {"label": "A", "text": "x", "is_correct": True},
                {"label": "B", "text": "y", "is_correct": True},
            ],
        )
        service, _ = _service(make_result(text=json.dumps({"questions": [q]})))
        with pytest.raises(InvalidGenerationResponseError):
            service.generate(make_request())


class TestDefaultConstruction:
    def test_default_generate_fn_is_gateway(self):
        # Constructed without injection → wired to the real gateway entry point.
        from ai.services import generate as gateway_generate

        service = QuestionGenerationService()
        assert service._generate is gateway_generate
