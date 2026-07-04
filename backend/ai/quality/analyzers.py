"""
Rule-based quality analyzers (Sprint-6B-03).

Each function is small, deterministic, and provider-independent — it inspects a
normalized :class:`ai.generation.dto.GeneratedQuestion` (+ the requested context or
a comparison corpus) and returns a typed sub-result. Nothing here calls a provider,
raises for normal input, or rejects a question; distractor/explanation analysis
returns **warnings only** (Tasks 6/7). Scoring aggregates the signals into a
0–100 score, an A–F grade, and reviewer-facing strengths / warnings /
recommendations (Task 8) — never an automatic accept/reject.
"""
from __future__ import annotations

import re
import statistics

from ai.generation.dto import GeneratedQuestion
from ai.quality.config import QualityConfig
from ai.quality.dto import (
    AlignmentResult,
    BloomResult,
    CorpusEntry,
    DifficultyResult,
    DuplicateMatch,
    DuplicateResult,
    QualityContext,
    Warning,
    WarningsResult,
)
from ai.quality.enums import (
    BLOOM_ORDER,
    AlignmentStatus,
    BloomComparison,
    DifficultyLevel,
    DuplicateClassification,
    QualityGrade,
)
from ai.quality.similarity import trigram_similarity
from ai.validation.dto import ValidatedQuestion

_WORD_RE = re.compile(r"[a-z0-9]+")

# Bloom action verbs → taxonomy level (used to *estimate* bloom for confidence).
_BLOOM_VERBS: dict[str, str] = {
    "define": "remember", "list": "remember", "name": "remember", "recall": "remember",
    "state": "remember", "identify": "remember", "label": "remember", "match": "remember",
    "explain": "understand", "describe": "understand", "summarize": "understand",
    "interpret": "understand", "classify": "understand", "compare": "understand",
    "apply": "apply", "solve": "apply", "calculate": "apply", "compute": "apply",
    "use": "apply", "demonstrate": "apply", "find": "apply",
    "analyze": "analyze", "analyse": "analyze", "differentiate": "analyze",
    "examine": "analyze", "distinguish": "analyze", "categorize": "analyze",
    "evaluate": "evaluate", "justify": "evaluate", "assess": "evaluate",
    "critique": "evaluate", "judge": "evaluate", "argue": "evaluate",
    "create": "create", "design": "create", "formulate": "create",
    "construct": "create", "compose": "create", "develop": "create",
}

_REASONING_CONNECTIVES = (
    "because", "since", "therefore", "hence", "thus", "so that", "as a result",
    "due to", "which means", "this is why", "in order to",
)

_OBVIOUS_OPTION_PHRASES = ("all of the above", "none of the above", "both a and b")


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall((text or "").casefold())


def _token_set(text: str) -> set[str]:
    return set(_tokens(text))


# ── Task 2: Duplicate detection ──────────────────────────────────────────────
def analyze_duplicates(
    question: GeneratedQuestion,
    corpus: list[CorpusEntry],
    cfg: QualityConfig,
) -> DuplicateResult:
    best = 0.0
    scored: list[DuplicateMatch] = []
    for entry in corpus:
        sim = trigram_similarity(question.stem, entry.stem)
        if sim > best:
            best = sim
        if sim >= cfg.duplicate_near_threshold:
            scored.append(DuplicateMatch(entry.question_id, entry.kind, sim))

    scored.sort(key=lambda m: m.similarity, reverse=True)
    matches = scored[: cfg.max_matches]

    if best >= cfg.duplicate_exact_threshold:
        classification = DuplicateClassification.EXACT.value
    elif best >= cfg.duplicate_near_threshold:
        classification = DuplicateClassification.NEAR.value
    else:
        classification = DuplicateClassification.UNIQUE.value

    return DuplicateResult(classification=classification, score=best, matches=matches)


# ── Task 3: Syllabus alignment ───────────────────────────────────────────────
def _coverage(target: str, haystack: set[str]) -> float:
    """Fraction of ``target``'s tokens present in ``haystack`` (0..1)."""
    target_tokens = _token_set(target)
    if not target_tokens:
        return 1.0  # nothing required to match
    return len(target_tokens & haystack) / len(target_tokens)


def analyze_alignment(
    question: GeneratedQuestion, context: QualityContext
) -> AlignmentResult:
    haystack = _token_set(
        " ".join(
            [question.stem, question.learning_objective, " ".join(question.tags or [])]
        )
    )
    topic_cov = _coverage(context.topic, haystack)
    subject_cov = _coverage(context.subject, haystack)
    has_subtopic = bool(context.subtopic)
    subtopic_cov = _coverage(context.subtopic or "", haystack) if has_subtopic else None

    topic_hit = topic_cov >= 0.5
    subtopic_hit = subtopic_cov is not None and subtopic_cov >= 0.5
    subject_hit = subject_cov >= 0.5

    if topic_hit and (subtopic_hit or not has_subtopic):
        status = AlignmentStatus.ALIGNED.value
        reason = "Question content matches the requested topic" + (
            " and subtopic." if subtopic_hit else "."
        )
    elif topic_hit or subtopic_hit or subject_hit:
        status = AlignmentStatus.WEAK.value
        matched = [
            name
            for name, hit in (
                ("subject", subject_hit),
                ("topic", topic_hit),
                ("subtopic", subtopic_hit),
            )
            if hit
        ]
        reason = f"Partial match: only the {', '.join(matched)} appears in the content."
    else:
        status = AlignmentStatus.MISALIGNED.value
        reason = (
            "No overlap between the question content and the requested "
            "subject/topic/subtopic."
        )

    # Weighted score: topic and subtopic carry the most signal.
    parts = [topic_cov, subject_cov]
    if subtopic_cov is not None:
        parts.append(subtopic_cov)
    score = sum(parts) / len(parts)
    return AlignmentResult(status=status, score=score, reason=reason)


# ── Task 4: Bloom validation ─────────────────────────────────────────────────
def _estimate_bloom(stem: str) -> str | None:
    for token in _tokens(stem):
        if token in _BLOOM_VERBS:
            return _BLOOM_VERBS[token]
    return None


def analyze_bloom(question: GeneratedQuestion, context: QualityContext) -> BloomResult:
    requested = context.requested_bloom
    generated = question.bloom_level

    if requested in BLOOM_ORDER and generated in BLOOM_ORDER:
        r_idx, g_idx = BLOOM_ORDER.index(requested), BLOOM_ORDER.index(generated)
        if g_idx == r_idx:
            status = BloomComparison.MATCH.value
        elif g_idx > r_idx:
            status = BloomComparison.HIGHER.value
        else:
            status = BloomComparison.LOWER.value
    else:
        status = (
            BloomComparison.MATCH.value
            if requested == generated
            else BloomComparison.HIGHER.value
        )

    # Confidence: does a Bloom verb in the stem agree with the declared level?
    estimated = _estimate_bloom(question.stem)
    if estimated is None:
        confidence = 0.5  # no verb signal — can't corroborate
    elif estimated == generated:
        confidence = 1.0
    elif (
        estimated in BLOOM_ORDER
        and generated in BLOOM_ORDER
        and abs(BLOOM_ORDER.index(estimated) - BLOOM_ORDER.index(generated)) == 1
    ):
        confidence = 0.6  # adjacent level
    else:
        confidence = 0.4

    return BloomResult(
        status=status, requested=requested, generated=generated, confidence=confidence
    )


# ── Task 5: Difficulty validation ────────────────────────────────────────────
def _estimate_difficulty(question: GeneratedQuestion) -> tuple[str, str]:
    """Return (level, reason) from deterministic textual signals."""
    stem_words = len(_tokens(question.stem))
    option_texts = [o.text for o in question.options]
    avg_option_words = (
        statistics.mean(len(_tokens(t)) for t in option_texts) if option_texts else 0
    )
    stem_l = question.stem.casefold()
    has_negation = any(w in stem_l for w in (" not ", " except", " neither", " false"))
    has_number = bool(re.search(r"\d", question.stem))
    multi_step = any(
        w in stem_l for w in ("calculate", "evaluate", "derive", "analyze", "compare")
    )

    signal = 0
    if stem_words >= 30:
        signal += 2
    elif stem_words >= 16:
        signal += 1
    if avg_option_words >= 6:
        signal += 1
    if has_negation:
        signal += 1
    if has_number:
        signal += 1
    if multi_step:
        signal += 1

    if signal <= 1:
        level = DifficultyLevel.EASY.value
    elif signal <= 3:
        level = DifficultyLevel.MEDIUM.value
    else:
        level = DifficultyLevel.HARD.value

    reason = (
        f"Estimated from stem length ({stem_words} words), option length "
        f"(~{avg_option_words:.0f} words), "
        f"{'negation, ' if has_negation else ''}"
        f"{'numeric content, ' if has_number else ''}"
        f"{'multi-step cues' if multi_step else 'no multi-step cues'}."
    )
    return level, reason


def analyze_difficulty(
    question: GeneratedQuestion, context: QualityContext
) -> DifficultyResult:
    estimated, reason = _estimate_difficulty(question)
    requested = context.requested_difficulty
    match = estimated == requested
    if not match:
        reason = f"Requested '{requested}' but content reads as '{estimated}'. " + reason
    return DifficultyResult(
        estimated=estimated, requested=requested, match=match, reason=reason
    )


# ── Task 6: Distractor quality (warnings only) ───────────────────────────────
def analyze_distractors(question: GeneratedQuestion) -> WarningsResult:
    options = question.options or []
    warnings: list[Warning] = []
    if len(options) < 2:
        return WarningsResult(warnings=warnings)

    texts = [o.text for o in options]
    lengths = [len(t) for t in texts]

    # Near-duplicate distractors (exact dupes are already a validation error).
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            sim = trigram_similarity(texts[i], texts[j])
            if 0.85 <= sim < 1.0:
                warnings.append(
                    Warning("near_duplicate_options", "Two options are almost identical.")
                )
                break
        else:
            continue
        break

    if any(t.casefold() in _OBVIOUS_OPTION_PHRASES for t in texts):
        warnings.append(
            Warning(
                "obvious_filler_option",
                "An 'all/none of the above' style option may weaken the item.",
            )
        )

    if any(len(t.strip()) <= 1 for t in texts):
        warnings.append(Warning("very_short_option", "One or more options are very short."))

    if len(set(lengths)) == 1 and len(options) > 2:
        warnings.append(
            Warning("uniform_option_length", "All options are the same length.")
        )

    # Correct answer is a length outlier (often a give-away).
    correct = [o for o in options if o.is_correct]
    if len(correct) == 1:
        correct_len = len(correct[0].text)
        distractor_lens = [len(o.text) for o in options if not o.is_correct]
        if distractor_lens:
            avg_distractor = statistics.mean(distractor_lens)
            if avg_distractor > 0 and correct_len >= 1.6 * avg_distractor:
                warnings.append(
                    Warning(
                        "correct_answer_too_obvious",
                        "The correct option is much longer than the distractors.",
                    )
                )

    return WarningsResult(warnings=warnings)


# ── Task 7: Explanation quality (warnings only) ──────────────────────────────
def analyze_explanation(question: GeneratedQuestion) -> WarningsResult:
    explanation = question.explanation or ""
    warnings: list[Warning] = []
    word_count = len(_tokens(explanation))

    if word_count < 8:
        warnings.append(
            Warning("explanation_too_short", "The explanation is very short.")
        )

    if explanation and trigram_similarity(explanation, question.stem) >= 0.7:
        warnings.append(
            Warning("explanation_copies_stem", "The explanation largely restates the stem.")
        )

    correct = next((o for o in question.options if o.is_correct), None)
    references_answer = bool(
        correct and (_token_set(correct.text) & _token_set(explanation))
    )
    has_reasoning = any(c in explanation.casefold() for c in _REASONING_CONNECTIVES)
    if word_count >= 8 and not references_answer and not has_reasoning:
        warnings.append(
            Warning(
                "explanation_missing_reasoning",
                "The explanation neither references the correct answer nor gives reasoning.",
            )
        )

    return WarningsResult(warnings=warnings)


# ── Task 8: Overall score / grade / strengths / recommendations ──────────────
def _grade_for(score: int) -> str:
    if score >= 90:
        return QualityGrade.A.value
    if score >= 80:
        return QualityGrade.B.value
    if score >= 70:
        return QualityGrade.C.value
    if score >= 60:
        return QualityGrade.D.value
    return QualityGrade.F.value


def score_quality(
    validated: ValidatedQuestion,
    duplicate: DuplicateResult,
    alignment: AlignmentResult,
    bloom: BloomResult,
    difficulty: DifficultyResult,
    distractors: WarningsResult,
    explanation: WarningsResult,
) -> tuple[int, str, list[str], list[Warning], list[str]]:
    score = 100
    strengths: list[str] = []
    warnings: list[Warning] = []
    recommendations: list[str] = []

    # Duplicate (never auto-rejects — only informs the score).
    if duplicate.classification == DuplicateClassification.EXACT.value:
        score -= 40
        warnings.append(Warning("duplicate_exact", "Looks like an exact duplicate."))
        recommendations.append(
            "Review against the most similar existing question before importing."
        )
    elif duplicate.classification == DuplicateClassification.NEAR.value:
        score -= 20
        warnings.append(Warning("duplicate_near", "A near-duplicate question exists."))
        recommendations.append("Compare with the near-duplicate; differentiate or discard.")
    else:
        strengths.append("No duplicates found in the existing bank.")

    # Alignment.
    if alignment.status == AlignmentStatus.MISALIGNED.value:
        score -= 25
        warnings.append(Warning("misaligned", "Content may not match the syllabus target."))
        recommendations.append("Verify the question against the requested topic/subtopic.")
    elif alignment.status == AlignmentStatus.WEAK.value:
        score -= 10
        warnings.append(Warning("weak_alignment", "Weak syllabus alignment."))
    else:
        strengths.append("Well aligned with the requested syllabus target.")

    # Bloom.
    if bloom.status != BloomComparison.MATCH.value:
        score -= 10
        warnings.append(
            Warning(
                "bloom_mismatch",
                f"Bloom level is {bloom.status} than requested "
                f"({bloom.generated} vs {bloom.requested}).",
            )
        )
        recommendations.append("Adjust the cognitive level to match the blueprint.")
    else:
        strengths.append("Bloom level matches the request.")

    # Difficulty.
    if not difficulty.match:
        score -= 15
        warnings.append(
            Warning(
                "difficulty_mismatch",
                f"Difficulty reads as '{difficulty.estimated}', not '{difficulty.requested}'.",
            )
        )
        recommendations.append("Re-check difficulty or regenerate at the requested level.")
    else:
        strengths.append("Difficulty matches the request.")

    # Distractor / explanation warnings (advisory).
    distractor_penalty = min(len(distractors.warnings) * 5, 20)
    explanation_penalty = min(len(explanation.warnings) * 5, 15)
    score -= distractor_penalty + explanation_penalty
    warnings.extend(distractors.warnings)
    warnings.extend(explanation.warnings)
    if not distractors.warnings:
        strengths.append("Distractors look well-formed.")
    if not explanation.warnings:
        strengths.append("Explanation is substantive.")

    # Validation warnings carried forward (validation errors never reach here —
    # only valid questions are analysed).
    validation_warnings = validated.warnings
    score -= min(len(validation_warnings) * 3, 10)
    for issue in validation_warnings:
        warnings.append(Warning(issue.code, issue.message))

    score = max(0, min(100, score))
    return score, _grade_for(score), strengths, warnings, recommendations
