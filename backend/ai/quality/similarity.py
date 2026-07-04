"""
Deterministic text similarity (Sprint-6B-03).

Trigram-set Jaccard similarity, mirroring PostgreSQL ``pg_trgm`` semantics (lower-
case, split into alphanumeric words, pad each word, compare trigram sets). It is
computed in Python so duplicate detection is **deterministic and database-portable**
(runs identically under the sqlite test DB and Postgres) and needs **no AI call**.

The ``embedding`` pgvector column on ``questions.Question`` is not yet populated by
any pipeline (populating it is an AI embedding call — out of scope for this rule-
based sprint), so vector cosine would compare against NULLs. This trigram measure
operates over the same corpus and the report shape is vector-ready: a later sprint
can swap the comparator without changing callers. See CLAUDE.md §7 (pgvector +
pg_trgm dedup, surfaced to a reviewer — never auto-merge).
"""
from __future__ import annotations

import re

_WORD_RE = re.compile(r"[a-z0-9]+")


def _trigrams(text: str) -> set[str]:
    grams: set[str] = set()
    for word in _WORD_RE.findall(text.casefold()):
        padded = f"  {word} "  # pg_trgm pads words with two leading + one trailing space
        for i in range(len(padded) - 2):
            grams.add(padded[i : i + 3])
    return grams


def trigram_similarity(a: str, b: str) -> float:
    """Jaccard similarity of the two strings' trigram sets, in ``[0.0, 1.0]``."""
    ta, tb = _trigrams(a or ""), _trigrams(b or "")
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    intersection = len(ta & tb)
    union = len(ta | tb)
    return intersection / union if union else 0.0
