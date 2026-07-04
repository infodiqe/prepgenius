"""
AI Taxonomy Resolution & Intelligent Import (Sprint-6C-01).

Deterministic taxonomy suggestions + a pre-import duplicate check to reduce reviewer
effort before an AI draft is imported into the Question Bank. The reviewer always
decides: nothing is auto-imported and no taxonomy is auto-updated.
"""
from ai.taxonomy.dto import TaxonomyResolution
from ai.taxonomy.service import AITaxonomyResolutionService

__all__ = ["AITaxonomyResolutionService", "TaxonomyResolution"]
