"""
Taxonomy-resolver configuration (Sprint-6C-01).

Thresholds are data, not code (CLAUDE.md §1). The resolver is fully deterministic
— no provider is ever called.
"""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True)
class TaxonomyConfig:
    # Minimum trigram similarity for a non-exact candidate to count as a partial
    # match (below this it is "no match").
    partial_threshold: float
    # Max candidates returned per level (Task 2 — "top 5 matches").
    max_matches: int


def taxonomy_config() -> TaxonomyConfig:
    return TaxonomyConfig(
        partial_threshold=float(
            getattr(settings, "AI_TAXONOMY_PARTIAL_THRESHOLD", 0.4)
        ),
        max_matches=int(getattr(settings, "AI_TAXONOMY_MAX_MATCHES", 5)),
    )
