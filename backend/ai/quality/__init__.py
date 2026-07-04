"""
AI Quality Intelligence Engine (Sprint-6B-03).

Rule-based, provider-independent quality analysis that runs AFTER validation and
BEFORE human review:

    Generate → Validate → Quality Analysis → Store Quality Report → Human Review → Publish

It NEVER rejects, publishes, edits, or approves a question — it only attaches
structured quality metadata to an :class:`ai.models.AIQuestionDraft` so reviewers
can prioritise. The existing review workflow remains the single source of truth.
"""
from ai.quality.dto import QualityAnalysisResult, QualityContext
from ai.quality.service import AIQualityAnalysisService

__all__ = [
    "AIQualityAnalysisService",
    "QualityAnalysisResult",
    "QualityContext",
]
