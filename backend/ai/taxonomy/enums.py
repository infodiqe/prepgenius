"""Taxonomy-matching enumerations (Sprint-6C-01)."""
from django.db import models


class MatchConfidence(models.TextChoices):
    EXACT = "exact", "Exact"
    PARTIAL = "partial", "Partial"
    NO_MATCH = "no_match", "No match"
