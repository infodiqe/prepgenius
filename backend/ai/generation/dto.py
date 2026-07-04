"""
Strongly-typed generation DTOs (Sprint-6A-02).

No raw dicts flow through the service. The request DTO carries validated input;
the response DTOs carry structured, JSON-safe output (no markdown/HTML). ``source``
is always ``"ai"`` (PRD §8 — AI content is provenance-tagged and Draft-only).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class QuestionGenerationRequest:
    exam: str
    subject: str
    topic: str
    difficulty: str
    bloom_level: str
    question_type: str
    language: str
    count: int
    subtopic: str | None = None
    additional_instructions: str | None = None


@dataclass(frozen=True)
class QuestionOption:
    label: str
    text: str
    is_correct: bool

    def to_dict(self) -> dict[str, Any]:
        return {"label": self.label, "text": self.text, "is_correct": self.is_correct}


@dataclass(frozen=True)
class GeneratedQuestion:
    stem: str
    options: list[QuestionOption]
    correct_answer: str
    explanation: str
    difficulty: str
    bloom_level: str
    estimated_time_seconds: int
    tags: list[str]
    learning_objective: str
    language: str
    question_type: str
    source: str = "ai"
    confidence_score: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "stem": self.stem,
            "options": [o.to_dict() for o in self.options],
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "difficulty": self.difficulty,
            "bloom_level": self.bloom_level,
            "estimated_time_seconds": self.estimated_time_seconds,
            "tags": list(self.tags),
            "learning_objective": self.learning_objective,
            "language": self.language,
            "question_type": self.question_type,
            "source": self.source,
            "confidence_score": self.confidence_score,
        }


@dataclass(frozen=True)
class QuestionGenerationResponse:
    questions: list[GeneratedQuestion]
    provider: str | None = None
    model: str | None = None
    request_id: str | None = None
    # Token usage / cost from the gateway AIResult. Propagated so callers that
    # persist a per-call audit record (e.g. draft regeneration, Sprint-6B-02) can
    # store them without re-querying — the JSON preview response ignores them.
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost: Decimal = field(default_factory=lambda: Decimal("0"))

    @property
    def count(self) -> int:
        return len(self.questions)

    def to_dict(self) -> dict[str, Any]:
        return {
            "questions": [q.to_dict() for q in self.questions],
            "count": self.count,
            "provider": self.provider,
            "model": self.model,
            "request_id": self.request_id,
        }
