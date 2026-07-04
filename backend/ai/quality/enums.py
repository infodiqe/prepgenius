"""
Quality-analysis enumerations (Sprint-6B-03).

Stable, machine-readable classifications the engine emits. Declared as
``TextChoices`` so they double as :class:`ai.models.AIQuestionDraft` column
choices (for admin filters and the workspace filters) and as report values.
"""
from django.db import models


class QualityGrade(models.TextChoices):
    A = "A", "A"
    B = "B", "B"
    C = "C", "C"
    D = "D", "D"
    F = "F", "F"


class DuplicateClassification(models.TextChoices):
    EXACT = "exact_duplicate", "Exact duplicate"
    NEAR = "near_duplicate", "Near duplicate"
    UNIQUE = "unique", "Unique"


class AlignmentStatus(models.TextChoices):
    ALIGNED = "aligned", "Aligned"
    WEAK = "weakly_aligned", "Weakly aligned"
    MISALIGNED = "misaligned", "Misaligned"


class BloomComparison(models.TextChoices):
    MATCH = "match", "Match"
    HIGHER = "higher", "Higher"
    LOWER = "lower", "Lower"


class DifficultyMatch(models.TextChoices):
    MATCH = "match", "Match"
    MISMATCH = "mismatch", "Mismatch"


class DifficultyLevel(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


#: Bloom's taxonomy, ordered low → high (for Match / Higher / Lower comparison).
BLOOM_ORDER: tuple[str, ...] = (
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
)
