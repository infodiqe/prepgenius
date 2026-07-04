"""
Taxonomy-resolution DTOs (Sprint-6C-01).

Typed, JSON-safe suggestion results. A :class:`TaxonomyResolution` is the full
snapshot (per-level top matches + the pre-import duplicate check) persisted verbatim
in ``AITaxonomyResolution.suggestion``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class TaxonomyMatch:
    id: str
    label: str
    confidence: str  # MatchConfidence
    score: float  # 0..1
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "confidence": self.confidence,
            "score": round(self.score, 4),
            "reason": self.reason,
        }


@dataclass(frozen=True)
class LevelSuggestion:
    level: str  # exam | subject | topic | subtopic
    query: str
    confidence: str  # confidence of the best candidate (or "no_match")
    best: TaxonomyMatch | None
    matches: list[TaxonomyMatch] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "level": self.level,
            "query": self.query,
            "confidence": self.confidence,
            "best": self.best.to_dict() if self.best else None,
            "matches": [m.to_dict() for m in self.matches],
        }


@dataclass(frozen=True)
class TaxonomyResolution:
    draft_id: str
    exam: LevelSuggestion
    subject: LevelSuggestion
    topic: LevelSuggestion
    subtopic: LevelSuggestion
    overall_confidence: str
    duplicates: dict[str, Any]

    @property
    def suggested_exam_id(self) -> str | None:
        return self._resolved_id(self.exam)

    @property
    def suggested_subtopic_id(self) -> str | None:
        return self._resolved_id(self.subtopic)

    @staticmethod
    def _resolved_id(level: LevelSuggestion) -> str | None:
        if level.best is not None and level.best.confidence != "no_match":
            return level.best.id
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "draft_id": self.draft_id,
            "exam": self.exam.to_dict(),
            "subject": self.subject.to_dict(),
            "topic": self.topic.to_dict(),
            "subtopic": self.subtopic.to_dict(),
            "overall_confidence": self.overall_confidence,
            "suggested_exam_id": self.suggested_exam_id,
            "suggested_subtopic_id": self.suggested_subtopic_id,
            "duplicates": self.duplicates,
        }


@dataclass(frozen=True)
class TaxonomyAcceptOutcome:
    import_result: Any  # ai.generation.import_service.ImportResult
    audit: Any  # ai.models.AITaxonomyResolution
