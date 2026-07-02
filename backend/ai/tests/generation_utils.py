"""Shared helpers/doubles for the question-generation test suite (Sprint-6A-02)."""
from __future__ import annotations

import json
from typing import Any

from ai.generation.dto import QuestionGenerationRequest
from ai.services.gateway import AIResult


def make_request(**overrides: Any) -> QuestionGenerationRequest:
    defaults: dict[str, Any] = {
        "exam": "CTET",
        "subject": "Mathematics",
        "topic": "Fractions",
        "difficulty": "medium",
        "bloom_level": "apply",
        "question_type": "single_correct",
        "language": "en",
        "count": 2,
        "subtopic": None,
        "additional_instructions": None,
    }
    defaults.update(overrides)
    return QuestionGenerationRequest(**defaults)


def question_dict(**overrides: Any) -> dict[str, Any]:
    q: dict[str, Any] = {
        "stem": "What is 1/2 + 1/2?",
        "options": [
            {"label": "A", "text": "0", "is_correct": False},
            {"label": "B", "text": "1", "is_correct": True},
            {"label": "C", "text": "2", "is_correct": False},
            {"label": "D", "text": "1/4", "is_correct": False},
        ],
        "correct_answer": "B",
        "explanation": "Halves sum to one whole.",
        "difficulty": "easy",
        "bloom_level": "remember",
        "estimated_time_seconds": 30,
        "tags": ["fractions", "addition"],
        "learning_objective": "Add like fractions.",
        "language": "en",
        "confidence_score": 0.92,
    }
    q.update(overrides)
    return q


def valid_json(count: int = 1, **question_overrides: Any) -> str:
    return json.dumps({"questions": [question_dict(**question_overrides) for _ in range(count)]})


def make_result(
    *,
    text: str = "",
    success: bool = True,
    error: str = "",
    provider: str | None = "mock",
    model: str | None = "mock-model",
    request_id: str | None = "req-123",
) -> AIResult:
    return AIResult(
        success=success,
        prompt_type="question_generation",
        provider=provider,
        model=model,
        text=text,
        request_id=request_id,
        error=error,
    )


class StubGenerate:
    """Callable stand-in for the gateway ``generate`` function."""

    def __init__(self, result: AIResult) -> None:
        self.result = result
        self.calls: list[dict[str, Any]] = []

    def __call__(self, **kwargs: Any) -> AIResult:
        self.calls.append(kwargs)
        return self.result

    @property
    def last_call(self) -> dict[str, Any]:
        return self.calls[-1]
