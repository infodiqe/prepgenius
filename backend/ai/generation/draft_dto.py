"""
Draft DTOs (Sprint-6A-04).

``DraftDTO`` is the JSON-safe view of a persisted :class:`ai.models.AIQuestionDraft`.
``DraftGenerationResult`` is the workflow outcome: the saved drafts plus the
rejected questions (never persisted) with their validation reports (reused
:class:`ai.validation.dto.ValidatedQuestion`).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from ai.validation.dto import ValidatedQuestion

if TYPE_CHECKING:  # avoid importing the model at module load (circular-safe)
    from ai.models import AIQuestionDraft


@dataclass(frozen=True)
class DraftDTO:
    id: str
    status: str
    exam: str
    subject: str
    topic: str
    subtopic: str | None
    question_type: str
    difficulty: str
    bloom_level: str
    language: str
    stem: str
    options: list[dict[str, Any]]
    correct_answer: str
    explanation: str
    learning_objective: str
    estimated_time: int
    tags: list[str]
    confidence: float | None
    provider: str
    model: str
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status,
            "exam": self.exam,
            "subject": self.subject,
            "topic": self.topic,
            "subtopic": self.subtopic,
            "question_type": self.question_type,
            "difficulty": self.difficulty,
            "bloom_level": self.bloom_level,
            "language": self.language,
            "stem": self.stem,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "learning_objective": self.learning_objective,
            "estimated_time": self.estimated_time,
            "tags": self.tags,
            "confidence": self.confidence,
            "provider": self.provider,
            "model": self.model,
            "created_at": self.created_at,
        }


def draft_to_dto(draft: AIQuestionDraft) -> DraftDTO:
    return DraftDTO(
        id=str(draft.id),
        status=draft.status,
        exam=draft.exam,
        subject=draft.subject,
        topic=draft.topic,
        subtopic=draft.subtopic,
        question_type=draft.question_type,
        difficulty=draft.difficulty,
        bloom_level=draft.bloom_level,
        language=draft.language,
        stem=draft.stem,
        options=draft.options,
        correct_answer=draft.correct_answer,
        explanation=draft.explanation,
        learning_objective=draft.learning_objective,
        estimated_time=draft.estimated_time,
        tags=draft.tags,
        confidence=draft.confidence,
        provider=draft.provider,
        model=draft.model,
        created_at=draft.created_at.isoformat() if draft.created_at else "",
    )


@dataclass(frozen=True)
class DraftGenerationResult:
    drafts: list[DraftDTO]
    rejected: list[ValidatedQuestion]
    provider: str | None = None
    model: str | None = None
    request_id: str | None = None

    @property
    def saved_count(self) -> int:
        return len(self.drafts)

    @property
    def rejected_count(self) -> int:
        return len(self.rejected)

    @property
    def generated_count(self) -> int:
        return self.saved_count + self.rejected_count

    @property
    def counts(self) -> dict[str, int]:
        return {
            "generated": self.generated_count,
            "saved": self.saved_count,
            "rejected": self.rejected_count,
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "drafts": [d.to_dict() for d in self.drafts],
            "rejected": [r.to_dict() for r in self.rejected],
            "counts": self.counts,
            "provider": self.provider,
            "model": self.model,
            "request_id": self.request_id,
        }
