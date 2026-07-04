"""
Quality-engine configuration (Sprint-6B-03).

All tunables are read from Django settings (env-overridable) so thresholds are
*data, not code* (CLAUDE.md §1 — config over code). Nothing here calls a provider;
the engine is entirely rule-based this sprint.
"""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True)
class QualityConfig:
    analysis_version: str
    # Trigram-similarity thresholds for duplicate classification (0..1).
    duplicate_exact_threshold: float
    duplicate_near_threshold: float
    # Bound the duplicate corpus scan (review-time, async — but stay predictable).
    corpus_limit: int
    max_matches: int


def quality_config() -> QualityConfig:
    return QualityConfig(
        analysis_version=str(getattr(settings, "AI_QUALITY_ANALYSIS_VERSION", "1.0")),
        duplicate_exact_threshold=float(
            getattr(settings, "AI_QUALITY_DUPLICATE_EXACT_THRESHOLD", 0.9)
        ),
        duplicate_near_threshold=float(
            getattr(settings, "AI_QUALITY_DUPLICATE_NEAR_THRESHOLD", 0.6)
        ),
        corpus_limit=int(getattr(settings, "AI_QUALITY_CORPUS_LIMIT", 500)),
        max_matches=int(getattr(settings, "AI_QUALITY_MAX_MATCHES", 5)),
    )
