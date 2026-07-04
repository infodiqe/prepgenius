"""
Quality-analysis DTOs (Sprint-6B-03).

Strongly-typed, JSON-safe results only. ``QualityContext`` carries the generation
intent (requested exam/subject/topic/subtopic/difficulty/bloom) the analyzers need
but that a :class:`ai.generation.dto.GeneratedQuestion` does not. Every result has a
``to_dict()`` so the whole report can be persisted verbatim in
``AIQuestionDraft.quality_report``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ── Input context ────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class QualityContext:
    exam: str
    subject: str
    topic: str
    subtopic: str | None
    requested_difficulty: str
    requested_bloom: str
    language: str | None = None
    # Exclude a draft from the "other generated drafts" corpus (re-analysis).
    exclude_draft_id: Any | None = None


@dataclass(frozen=True)
class CorpusEntry:
    """One comparison candidate for duplicate detection."""

    question_id: str
    stem: str
    kind: str  # published | imported_ai | draft


# ── Sub-results ──────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Warning:
    code: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {"code": self.code, "message": self.message}


@dataclass(frozen=True)
class DuplicateMatch:
    question_id: str
    kind: str
    similarity: float  # 0..1

    def to_dict(self) -> dict[str, Any]:
        return {
            "question_id": self.question_id,
            "kind": self.kind,
            "similarity": round(self.similarity, 4),
            "similarity_pct": round(self.similarity * 100, 1),
        }


@dataclass(frozen=True)
class DuplicateResult:
    classification: str  # DuplicateClassification
    score: float  # highest similarity, 0..1
    matches: list[DuplicateMatch]

    @property
    def similarity_pct(self) -> float:
        return round(self.score * 100, 1)

    @property
    def most_similar_ids(self) -> list[str]:
        return [m.question_id for m in self.matches]

    def to_dict(self) -> dict[str, Any]:
        return {
            "classification": self.classification,
            "score": round(self.score, 4),
            "similarity_pct": self.similarity_pct,
            "most_similar_ids": self.most_similar_ids,
            "matches": [m.to_dict() for m in self.matches],
        }


@dataclass(frozen=True)
class AlignmentResult:
    status: str  # AlignmentStatus
    score: float  # 0..1
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {"status": self.status, "score": round(self.score, 4), "reason": self.reason}


@dataclass(frozen=True)
class BloomResult:
    status: str  # BloomComparison
    requested: str
    generated: str
    confidence: float  # 0..1

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "requested": self.requested,
            "generated": self.generated,
            "confidence": round(self.confidence, 4),
        }


@dataclass(frozen=True)
class DifficultyResult:
    estimated: str  # DifficultyLevel
    requested: str
    match: bool
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "estimated": self.estimated,
            "requested": self.requested,
            "match": self.match,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class WarningsResult:
    """Distractor / explanation analysis: warnings only (never rejects)."""

    warnings: list[Warning] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"warnings": [w.to_dict() for w in self.warnings]}


# ── Overall ──────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class QualityAnalysisResult:
    quality_score: int  # 0..100
    quality_grade: str  # QualityGrade
    duplicate: DuplicateResult
    alignment: AlignmentResult
    bloom: BloomResult
    difficulty: DifficultyResult
    distractors: WarningsResult
    explanation: WarningsResult
    strengths: list[str]
    warnings: list[Warning]
    recommendations: list[str]
    analysis_version: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "quality_score": self.quality_score,
            "quality_grade": self.quality_grade,
            "duplicate": self.duplicate.to_dict(),
            "alignment": self.alignment.to_dict(),
            "bloom": self.bloom.to_dict(),
            "difficulty": self.difficulty.to_dict(),
            "distractors": self.distractors.to_dict(),
            "explanation": self.explanation.to_dict(),
            "strengths": list(self.strengths),
            "warnings": [w.to_dict() for w in self.warnings],
            "recommendations": list(self.recommendations),
            "analysis_version": self.analysis_version,
        }
