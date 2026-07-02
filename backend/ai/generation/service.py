"""
QuestionGenerationService (Sprint-6A-02).

Stateless orchestration for AI question generation:

    validate request → build prompt payload → call AI Gateway → parse JSON
    → map to typed DTOs → return response

It performs **no database writes** and **never calls a provider directly** — all
model access goes through the Sprint-6A-01 gateway (``ai.services.generate``),
which selects the provider/model, retries/falls back, and records its own
audit row. The gateway function is injected (default: the real gateway) so tests
can drive it without any live call.

Only ``single_correct`` MCQs are implemented this sprint; the mapper and DTOs are
shaped so additional question types slot in without touching the request/prompt
plumbing.
"""
from __future__ import annotations

import json
import re
from typing import Any, Callable

from ai.enums import PromptType
from ai.generation.dto import (
    GeneratedQuestion,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
    QuestionOption,
)
from ai.generation.enums import (
    MAX_QUESTIONS_PER_REQUEST,
    SUPPORTED_QUESTION_TYPES,
    BloomLevel,
    Difficulty,
    QuestionType,
    supported_languages,
)
from ai.generation.exceptions import (
    EmptyGenerationResponseError,
    GenerationTimeoutError,
    InvalidGenerationRequestError,
    InvalidGenerationResponseError,
    ProviderUnavailableError,
    UnsupportedLanguageError,
    UnsupportedQuestionTypeError,
)
from ai.services import generate as gateway_generate

_DEFAULT_ESTIMATED_TIME_SECONDS = 60
_CODE_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def build_generation_payload(request: QuestionGenerationRequest) -> dict[str, Any]:
    """
    Build the prompt payload for a generation request. Shared so other services
    (e.g. the draft service, which records the exact prompt) reuse the same
    mapping instead of duplicating it.
    """
    language_name = supported_languages().get(request.language, request.language)
    return {
        "exam": request.exam,
        "subject": request.subject,
        "topic": request.topic,
        "subtopic": request.subtopic or "not specified",
        "difficulty": request.difficulty,
        "bloom_level": request.bloom_level,
        "question_type": request.question_type,
        "language": language_name,
        "count": request.count,
        "additional_instructions": request.additional_instructions or "none",
    }


class QuestionGenerationService:
    """Generates structured questions via the AI gateway. No DB writes."""

    def __init__(self, generate_fn: Callable[..., Any] | None = None) -> None:
        # Dependency-injected gateway entry point (defaults to the real gateway).
        self._generate = generate_fn or gateway_generate

    # ── Public API ───────────────────────────────────────────────────────────
    def generate(
        self,
        request: QuestionGenerationRequest,
        *,
        created_by: Any | None = None,
    ) -> QuestionGenerationResponse:
        self._validate(request)
        payload = self._build_payload(request)

        result = self._generate(
            prompt_type=PromptType.QUESTION_GENERATION,
            payload=payload,
            created_by=created_by,
        )

        if not result.success:
            error = (result.error or "").lower()
            if "timeout" in error or "timed out" in error:
                raise GenerationTimeoutError(result.error or "AI generation timed out.")
            raise ProviderUnavailableError(
                result.error or "AI provider is currently unavailable."
            )

        text = (result.text or "").strip()
        if not text:
            raise EmptyGenerationResponseError("AI returned an empty response.")

        data = self._parse_json(text)
        questions = self._map_questions(data, request)
        if not questions:
            raise EmptyGenerationResponseError("AI returned no questions.")

        return QuestionGenerationResponse(
            questions=questions,
            provider=result.provider,
            model=result.model,
            request_id=result.request_id,
        )

    # ── Validation ───────────────────────────────────────────────────────────
    def _validate(self, request: QuestionGenerationRequest) -> None:
        for field_name in ("exam", "subject", "topic"):
            if not (getattr(request, field_name) or "").strip():
                raise InvalidGenerationRequestError(f"'{field_name}' is required.")

        if request.question_type not in QuestionType.values:
            raise UnsupportedQuestionTypeError(
                f"Unknown question type: '{request.question_type}'."
            )
        if request.question_type not in SUPPORTED_QUESTION_TYPES:
            raise UnsupportedQuestionTypeError(
                f"Question type '{request.question_type}' is not yet supported. "
                f"Supported: {', '.join(sorted(SUPPORTED_QUESTION_TYPES))}."
            )

        if request.language not in supported_languages():
            raise UnsupportedLanguageError(
                f"Language '{request.language}' is not supported. "
                f"Supported: {', '.join(sorted(supported_languages()))}."
            )

        if request.difficulty not in Difficulty.values:
            raise InvalidGenerationRequestError(
                f"Invalid difficulty: '{request.difficulty}'."
            )
        if request.bloom_level not in BloomLevel.values:
            raise InvalidGenerationRequestError(
                f"Invalid bloom level: '{request.bloom_level}'."
            )
        if not isinstance(request.count, int) or request.count < 1:
            raise InvalidGenerationRequestError("count must be a positive integer.")
        if request.count > MAX_QUESTIONS_PER_REQUEST:
            raise InvalidGenerationRequestError(
                f"count exceeds the maximum of {MAX_QUESTIONS_PER_REQUEST}."
            )

    # ── Prompt payload ───────────────────────────────────────────────────────
    def _build_payload(self, request: QuestionGenerationRequest) -> dict[str, Any]:
        return build_generation_payload(request)

    # ── Response parsing / mapping ───────────────────────────────────────────
    def _parse_json(self, text: str) -> Any:
        cleaned = _CODE_FENCE_RE.sub("", text).strip()
        try:
            return json.loads(cleaned)
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidGenerationResponseError(
                "AI response was not valid JSON."
            ) from exc

    def _map_questions(
        self, data: Any, request: QuestionGenerationRequest
    ) -> list[GeneratedQuestion]:
        if isinstance(data, dict):
            raw_questions = data.get("questions", [])
        elif isinstance(data, list):
            raw_questions = data
        else:
            raise InvalidGenerationResponseError(
                "AI response JSON is not an object or array."
            )
        if not isinstance(raw_questions, list):
            raise InvalidGenerationResponseError("'questions' must be an array.")
        return [self._map_single_correct(item, request) for item in raw_questions]

    def _map_single_correct(
        self, item: Any, request: QuestionGenerationRequest
    ) -> GeneratedQuestion:
        if not isinstance(item, dict):
            raise InvalidGenerationResponseError("Each question must be an object.")

        stem = str(item.get("stem", "")).strip()
        if not stem:
            raise InvalidGenerationResponseError("A question is missing its stem.")

        options = self._map_options(item.get("options"))
        if len(options) < 2:
            raise InvalidGenerationResponseError(
                "A question must have at least two options."
            )

        correct_answer = self._resolve_correct_answer(item, options)

        return GeneratedQuestion(
            stem=stem,
            options=options,
            correct_answer=correct_answer,
            explanation=str(item.get("explanation", "")).strip(),
            difficulty=str(item.get("difficulty") or request.difficulty),
            bloom_level=str(item.get("bloom_level") or request.bloom_level),
            estimated_time_seconds=self._coerce_int(
                item.get("estimated_time_seconds"), _DEFAULT_ESTIMATED_TIME_SECONDS
            ),
            tags=self._coerce_tags(item.get("tags")),
            learning_objective=str(item.get("learning_objective", "")).strip(),
            language=str(item.get("language") or request.language),
            question_type=request.question_type,
            source="ai",
            confidence_score=self._coerce_confidence(item.get("confidence_score")),
        )

    def _map_options(self, raw_options: Any) -> list[QuestionOption]:
        if not isinstance(raw_options, list):
            raise InvalidGenerationResponseError("'options' must be an array.")
        options: list[QuestionOption] = []
        for idx, raw in enumerate(raw_options):
            if not isinstance(raw, dict):
                raise InvalidGenerationResponseError("Each option must be an object.")
            label = str(raw.get("label") or chr(ord("A") + idx)).strip()
            text = str(raw.get("text") or raw.get("body") or "").strip()
            if not text:
                raise InvalidGenerationResponseError("An option is missing its text.")
            options.append(
                QuestionOption(label=label, text=text, is_correct=bool(raw.get("is_correct")))
            )
        return options

    def _resolve_correct_answer(
        self, item: dict[str, Any], options: list[QuestionOption]
    ) -> str:
        declared = str(item.get("correct_answer", "")).strip()
        labels = {o.label for o in options}
        if declared and declared in labels:
            return declared
        flagged = [o.label for o in options if o.is_correct]
        if len(flagged) == 1:
            return flagged[0]
        raise InvalidGenerationResponseError(
            "Could not determine a single correct answer for a question."
        )

    # ── Coercion helpers ─────────────────────────────────────────────────────
    @staticmethod
    def _coerce_int(value: Any, default: int) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _coerce_tags(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(t).strip() for t in value if str(t).strip()]
        return []

    @staticmethod
    def _coerce_confidence(value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
