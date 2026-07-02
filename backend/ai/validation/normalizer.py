"""
Question normalizer (Sprint-6A-03).

Deterministic, total, side-effect-free cleanup of a
:class:`ai.generation.dto.GeneratedQuestion`. It never raises — malformed input
is coerced to a well-formed shape so downstream validators can flag it. Text is
unicode-normalized (NFC), unescaped, stripped of HTML and markdown, has smart
quotes/dashes folded to ASCII, and whitespace collapsed (PRD §7/§8: AI content is
plain text, no markdown/HTML). Enum-ish fields (difficulty, bloom, language) are
lowercased and mapped through synonym tables; option labels are re-lettered by
position; tags are de-duplicated and sorted.

Correctness flags (``is_correct``) are intentionally left untouched so the
Correctness validator can still detect zero/multiple correct answers on the
normalized question.
"""
from __future__ import annotations

import dataclasses
import html
import re
from typing import Any

from ai.generation.dto import GeneratedQuestion, QuestionOption
from ai.generation.enums import supported_languages

# ── Character folding ────────────────────────────────────────────────────────
_TRANSLATE = str.maketrans(
    {
        "“": '"', "”": '"', "„": '"', "‟": '"',
        "‘": "'", "’": "'", "‚": "'", "‛": "'",
        "′": "'", "″": '"',
        "–": "-", "—": "-", "―": "-", "−": "-",
        "…": "...",
        " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
        "​": "", "‌": "", "‍": "", "﻿": "",
    }
)

_TAG_RE = re.compile(r"<[^>]+>")
_HEADING_RE = re.compile(r"(?m)^\s{0,3}#{1,6}\s*")
_BLOCKQUOTE_RE = re.compile(r"(?m)^\s{0,3}>\s?")
_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_INLINE_CODE_RE = re.compile(r"`([^`]*)`")
_BOLD_RE = re.compile(r"\*\*(.*?)\*\*|__(.*?)__", re.DOTALL)
_ITALIC_RE = re.compile(r"\*(.*?)\*|_(.*?)_", re.DOTALL)
_WS_RE = re.compile(r"\s+")
_LABEL_RE = re.compile(r"[^A-Za-z0-9]")

_DIFFICULTY_SYNONYMS = {
    "easy": "easy", "simple": "easy", "beginner": "easy", "1": "easy",
    "medium": "medium", "moderate": "medium", "intermediate": "medium", "2": "medium",
    "hard": "hard", "difficult": "hard", "advanced": "hard", "3": "hard",
}
_BLOOM_SYNONYMS = {
    "remember": "remember", "remembering": "remember", "knowledge": "remember",
    "understand": "understand", "understanding": "understand", "comprehension": "understand",
    "apply": "apply", "applying": "apply", "application": "apply",
    "analyze": "analyze", "analyse": "analyze", "analyzing": "analyze",
    "analysing": "analyze", "analysis": "analyze",
    "evaluate": "evaluate", "evaluating": "evaluate", "evaluation": "evaluate",
    "create": "create", "creating": "create", "synthesis": "create",
}
_LANGUAGE_ALIASES = {
    "english": "en",
    "assamese": "as",
    "hindi": "hi",
}


def _clean_text(value: Any) -> str:
    """Unicode-normalize, unescape, de-HTML, de-markdown, fold, and collapse."""
    import unicodedata

    text = value if isinstance(value, str) else ("" if value is None else str(value))
    text = unicodedata.normalize("NFC", text)
    text = html.unescape(text)
    text = _TAG_RE.sub("", text)
    text = text.replace("```", "")
    text = _IMAGE_RE.sub(r"\1", text)
    text = _LINK_RE.sub(r"\1", text)
    text = _INLINE_CODE_RE.sub(r"\1", text)
    text = _BOLD_RE.sub(lambda m: m.group(1) or m.group(2) or "", text)
    text = _ITALIC_RE.sub(lambda m: m.group(1) or m.group(2) or "", text)
    text = _HEADING_RE.sub("", text)
    text = _BLOCKQUOTE_RE.sub("", text)
    text = text.translate(_TRANSLATE)
    text = _WS_RE.sub(" ", text)
    return text.strip()


def _clean_label(value: Any) -> str:
    text = value if isinstance(value, str) else ("" if value is None else str(value))
    return _LABEL_RE.sub("", text).upper()


def _index_to_label(index: int) -> str:
    # A..Z, then AA, AB, … (defensive; questions have few options).
    label = ""
    n = index
    while True:
        label = chr(ord("A") + n % 26) + label
        n = n // 26 - 1
        if n < 0:
            break
    return label


def _normalize_choice(value: Any, synonyms: dict[str, str]) -> str:
    key = _clean_text(value).lower()
    return synonyms.get(key, key)


def _normalize_language(value: Any) -> str:
    key = _clean_text(value).lower().replace("_", "-")
    base = key.split("-", 1)[0]
    return _LANGUAGE_ALIASES.get(base, base)


def _normalize_tags(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    seen: dict[str, str] = {}
    for raw in value:
        cleaned = _clean_text(raw)
        if not cleaned:
            continue
        seen.setdefault(cleaned.casefold(), cleaned)
    return sorted(seen.values(), key=str.casefold)


class QuestionNormalizer:
    """Produce a normalized copy of a ``GeneratedQuestion``. Never raises."""

    def normalize(self, question: GeneratedQuestion) -> GeneratedQuestion:
        raw_options = question.options if isinstance(question.options, list) else []
        options = self._normalize_options(raw_options)
        correct_answer = self._normalize_correct_answer(question, raw_options)

        return dataclasses.replace(
            question,
            stem=_clean_text(question.stem),
            explanation=_clean_text(question.explanation),
            learning_objective=_clean_text(question.learning_objective),
            options=options,
            correct_answer=correct_answer,
            difficulty=_normalize_choice(question.difficulty, _DIFFICULTY_SYNONYMS),
            bloom_level=_normalize_choice(question.bloom_level, _BLOOM_SYNONYMS),
            language=_normalize_language(question.language),
            tags=_normalize_tags(question.tags),
        )

    def _normalize_options(self, raw_options: list) -> list[QuestionOption]:
        options: list[QuestionOption] = []
        for index, opt in enumerate(raw_options):
            text = _clean_text(getattr(opt, "text", ""))
            is_correct = bool(getattr(opt, "is_correct", False))
            options.append(
                QuestionOption(label=_index_to_label(index), text=text, is_correct=is_correct)
            )
        return options

    def _normalize_correct_answer(
        self, question: GeneratedQuestion, raw_options: list
    ) -> str:
        """Re-map the declared correct answer to the position-based label."""
        raw_labels = [_clean_label(getattr(o, "label", "")) for o in raw_options]
        declared = _clean_label(question.correct_answer)
        if declared and declared in raw_labels:
            return _index_to_label(raw_labels.index(declared))
        flagged = [i for i, o in enumerate(raw_options) if getattr(o, "is_correct", False)]
        if len(flagged) == 1:
            return _index_to_label(flagged[0])
        return ""


def supported_language_codes() -> set[str]:
    return set(supported_languages().keys())
