"""
Review-assistant DTOs (Sprint-6B-04).

Typed, JSON-safe results: pre-improvement recommendations (Task 5), the
before/after quality comparison (Task 4), and the improvement outcome. All derive
deterministically from the reused quality analysis — no new AI.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ── Task 5: Recommendations ──────────────────────────────────────────────────
@dataclass(frozen=True)
class ReviewRecommendation:
    code: str
    suggested_action: str  # a ReviewAction value (or "" when only informational)
    reason: str
    severity: str  # "warning" | "info"

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "suggested_action": self.suggested_action,
            "reason": self.reason,
            "severity": self.severity,
        }


@dataclass(frozen=True)
class ReviewRecommendations:
    draft_id: str
    quality_score: int | None
    quality_grade: str
    recommendations: list[ReviewRecommendation] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "draft_id": self.draft_id,
            "quality_score": self.quality_score,
            "quality_grade": self.quality_grade,
            "recommendations": [r.to_dict() for r in self.recommendations],
        }


# ── Task 4: Quality comparison ───────────────────────────────────────────────
@dataclass(frozen=True)
class DimensionChange:
    before: Any
    after: Any
    changed: bool

    def to_dict(self) -> dict[str, Any]:
        return {"before": self.before, "after": self.after, "changed": self.changed}


@dataclass(frozen=True)
class QualityComparison:
    old_score: int
    new_score: int
    quality_delta: int
    bloom: DimensionChange
    difficulty: DimensionChange
    duplicate: DimensionChange
    alignment: DimensionChange
    explanation_delta: int  # positive = fewer explanation warnings (improved)

    def to_dict(self) -> dict[str, Any]:
        return {
            "old_score": self.old_score,
            "new_score": self.new_score,
            "quality_delta": self.quality_delta,
            "bloom_delta": self.bloom.to_dict(),
            "difficulty_delta": self.difficulty.to_dict(),
            "duplicate_delta": self.duplicate.to_dict(),
            "alignment_delta": self.alignment.to_dict(),
            "explanation_delta": self.explanation_delta,
        }


def compare_quality(before, after) -> QualityComparison:
    """Deterministic before/after comparison of two QualityAnalysisResult objects."""
    return QualityComparison(
        old_score=before.quality_score,
        new_score=after.quality_score,
        quality_delta=after.quality_score - before.quality_score,
        bloom=DimensionChange(
            before.bloom.status, after.bloom.status, before.bloom.status != after.bloom.status
        ),
        difficulty=DimensionChange(
            before.difficulty.estimated,
            after.difficulty.estimated,
            before.difficulty.estimated != after.difficulty.estimated,
        ),
        duplicate=DimensionChange(
            before.duplicate.classification,
            after.duplicate.classification,
            before.duplicate.classification != after.duplicate.classification,
        ),
        alignment=DimensionChange(
            before.alignment.status,
            after.alignment.status,
            before.alignment.status != after.alignment.status,
        ),
        explanation_delta=len(before.explanation.warnings) - len(after.explanation.warnings),
    )


# ── Improvement outcome ──────────────────────────────────────────────────────
@dataclass(frozen=True)
class ReviewImprovementOutcome:
    draft: Any  # ai.models.AIQuestionDraft (updated in place)
    regeneration: Any  # ai.models.AIDraftRegeneration (new immutable version)
    comparison: QualityComparison
