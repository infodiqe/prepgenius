"""Helpers for the validation test suite (Sprint-6A-03)."""
from __future__ import annotations

from typing import Any

from ai.generation.dto import GeneratedQuestion, QuestionOption


def good_options() -> list[QuestionOption]:
    return [
        QuestionOption("A", "3", False),
        QuestionOption("B", "4", True),
        QuestionOption("C", "5", False),
        QuestionOption("D", "6", False),
    ]


def good_question(**overrides: Any) -> GeneratedQuestion:
    defaults: dict[str, Any] = {
        "stem": "What is 2 + 2?",
        "options": good_options(),
        "correct_answer": "B",
        "explanation": "Two plus two equals four.",
        "difficulty": "medium",
        "bloom_level": "apply",
        "estimated_time_seconds": 30,
        "tags": ["arithmetic"],
        "learning_objective": "Add small integers.",
        "language": "en",
        "question_type": "single_correct",
        "source": "ai",
        "confidence_score": 0.9,
    }
    defaults.update(overrides)
    return GeneratedQuestion(**defaults)
