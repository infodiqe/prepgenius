"""
AIQualityAnalysisService + analyzer tests (Sprint-6B-03).

Pure rule-based logic — no DB, no providers. The duplicate corpus is injected as a
plain list so analysis is exercised without any question/exam fixtures.
"""
import pytest

from ai.generation.dto import GeneratedQuestion, QuestionOption
from ai.quality import AIQualityAnalysisService, QualityContext
from ai.quality.analyzers import (
    analyze_alignment,
    analyze_bloom,
    analyze_difficulty,
    analyze_distractors,
    analyze_duplicates,
    analyze_explanation,
    score_quality,
)
from ai.quality.config import QualityConfig
from ai.quality.dto import CorpusEntry
from ai.quality.similarity import trigram_similarity
from ai.validation.dto import ValidatedQuestion, ValidationIssue, ValidationResult

CFG = QualityConfig(
    analysis_version="1.0",
    duplicate_exact_threshold=0.9,
    duplicate_near_threshold=0.6,
    corpus_limit=500,
    max_matches=5,
)


def make_q(
    *,
    stem="What is one half plus one half in fractions?",
    options=None,
    explanation="One half plus one half equals one because the halves combine.",
    difficulty="medium",
    bloom="apply",
    learning_objective="Add like fractions to make a whole.",
    tags=None,
    correct="B",
    language="en",
):
    opts = options or [
        ("A", "zero", False),
        ("B", "one", True),
        ("C", "two", False),
        ("D", "three", False),
    ]
    qopts = [QuestionOption(label=l, text=t, is_correct=c) for l, t, c in opts]
    return GeneratedQuestion(
        stem=stem,
        options=qopts,
        correct_answer=correct,
        explanation=explanation,
        difficulty=difficulty,
        bloom_level=bloom,
        estimated_time_seconds=30,
        tags=tags if tags is not None else ["fractions"],
        learning_objective=learning_objective,
        language=language,
        question_type="single_correct",
    )


def make_validated(question, *, warnings=None):
    return ValidatedQuestion(
        normalized_question=question,
        result=ValidationResult(
            valid=True,
            errors=[],
            warnings=warnings or [],
        ),
    )


def ctx(**overrides):
    base = dict(
        exam="CTET",
        subject="Mathematics",
        topic="Fractions",
        subtopic=None,
        requested_difficulty="medium",
        requested_bloom="apply",
        language="en",
    )
    base.update(overrides)
    return QualityContext(**base)


# ── Similarity ───────────────────────────────────────────────────────────────
class TestSimilarity:
    def test_identical_is_one(self):
        assert trigram_similarity("hello world", "hello world") == 1.0

    def test_disjoint_is_zero(self):
        assert trigram_similarity("abcdef", "zyxwvu") == 0.0

    def test_both_empty_is_one(self):
        assert trigram_similarity("", "") == 1.0

    def test_one_empty_is_zero(self):
        assert trigram_similarity("hello", "") == 0.0

    def test_partial_between(self):
        s = trigram_similarity("the cat sat", "the cat ran")
        assert 0.0 < s < 1.0


# ── Task 2: Duplicates ───────────────────────────────────────────────────────
class TestDuplicates:
    def test_exact_duplicate(self):
        q = make_q(stem="What is the capital of France today?")
        corpus = [CorpusEntry("q1", "What is the capital of France today?", "published")]
        res = analyze_duplicates(q, corpus, CFG)
        assert res.classification == "exact_duplicate"
        assert res.most_similar_ids == ["q1"]
        assert res.similarity_pct == 100.0

    def test_near_duplicate(self):
        q = make_q(stem="What is the capital city of France?")
        corpus = [CorpusEntry("q1", "What is the capital of France?", "published")]
        res = analyze_duplicates(q, corpus, CFG)
        assert res.classification == "near_duplicate"
        assert "q1" in res.most_similar_ids

    def test_unique(self):
        q = make_q(stem="Define the term photosynthesis in biology.")
        corpus = [CorpusEntry("q1", "Compute the derivative of a polynomial.", "draft")]
        res = analyze_duplicates(q, corpus, CFG)
        assert res.classification == "unique"
        assert res.matches == []

    def test_matches_capped_and_sorted(self):
        q = make_q(stem="What is the capital of France?")
        corpus = [
            CorpusEntry(f"q{i}", "What is the capital of France?", "published")
            for i in range(8)
        ]
        cfg = QualityConfig("1.0", 0.9, 0.6, 500, 3)
        res = analyze_duplicates(q, corpus, cfg)
        assert len(res.matches) == 3  # capped at max_matches


# ── Task 3: Alignment ────────────────────────────────────────────────────────
class TestAlignment:
    def test_aligned(self):
        q = make_q(stem="Add the fractions one half and one half.", tags=["fractions"])
        res = analyze_alignment(q, ctx(topic="Fractions"))
        assert res.status == "aligned"

    def test_aligned_with_subtopic(self):
        q = make_q(
            stem="Add the fractions one half and one half.",
            learning_objective="Practice fraction addition.",
            tags=["fractions", "addition"],
        )
        res = analyze_alignment(q, ctx(topic="Fractions", subtopic="Addition"))
        assert res.status == "aligned"
        assert "subtopic" in res.reason

    def test_weakly_aligned(self):
        # Topic word absent, but the subject word appears → weak.
        q = make_q(
            stem="A question about mathematics with no topic word.",
            learning_objective="general",
            tags=[],
        )
        res = analyze_alignment(q, ctx(topic="Photosynthesis", subject="Mathematics"))
        assert res.status == "weakly_aligned"

    def test_misaligned(self):
        q = make_q(
            stem="An unrelated sentence entirely.",
            learning_objective="none",
            tags=[],
        )
        res = analyze_alignment(
            q, ctx(topic="Photosynthesis", subject="Biology", subtopic="Chloroplast")
        )
        assert res.status == "misaligned"


# ── Task 4: Bloom ────────────────────────────────────────────────────────────
class TestBloom:
    def test_match(self):
        q = make_q(bloom="apply", stem="Apply the rule to solve this.")
        res = analyze_bloom(q, ctx(requested_bloom="apply"))
        assert res.status == "match"
        assert res.confidence == 1.0  # verb 'apply' agrees

    def test_higher(self):
        q = make_q(bloom="evaluate")
        res = analyze_bloom(q, ctx(requested_bloom="apply"))
        assert res.status == "higher"

    def test_lower(self):
        q = make_q(bloom="remember")
        res = analyze_bloom(q, ctx(requested_bloom="apply"))
        assert res.status == "lower"

    def test_confidence_no_verb(self):
        q = make_q(bloom="apply", stem="A statement with no action verb here.")
        res = analyze_bloom(q, ctx(requested_bloom="apply"))
        assert res.confidence == 0.5

    def test_unknown_levels_fall_back_to_equality(self):
        q = make_q(bloom="weird")
        res = analyze_bloom(q, ctx(requested_bloom="weird"))
        assert res.status == "match"

    def test_unknown_levels_unequal_reports_higher(self):
        q = make_q(bloom="weird")
        res = analyze_bloom(q, ctx(requested_bloom="apply"))
        assert res.status == "higher"

    def test_adjacent_verb_confidence(self):
        # Declared 'understand' but stem verb 'apply' → adjacent level → 0.6.
        q = make_q(bloom="understand", stem="Apply the given rule to this case.")
        res = analyze_bloom(q, ctx(requested_bloom="understand"))
        assert res.confidence == 0.6


# ── Task 5: Difficulty ───────────────────────────────────────────────────────
class TestDifficulty:
    def test_easy(self):
        q = make_q(stem="What is water?", difficulty="easy")
        res = analyze_difficulty(q, ctx(requested_difficulty="easy"))
        assert res.estimated == "easy"
        assert res.match is True

    def test_hard_with_signals(self):
        q = make_q(
            stem=(
                "Calculate and evaluate the result when 12 is not equal to the "
                "derived value across multiple steps of this long analytical problem "
                "that spans many words to increase complexity substantially here."
            ),
            difficulty="hard",
        )
        res = analyze_difficulty(q, ctx(requested_difficulty="hard"))
        assert res.estimated == "hard"
        assert res.match is True

    def test_medium_estimate(self):
        # ~20 words (+1) + multi-step verb 'calculate' (+1) + digit 16 (+1) = 3 → medium.
        q = make_q(
            stem=(
                "Calculate the value of x when the two given quantities differ by "
                "exactly 16 units in this short word problem here."
            ),
            difficulty="medium",
        )
        res = analyze_difficulty(q, ctx(requested_difficulty="medium"))
        assert res.estimated == "medium"
        assert res.match is True

    def test_mismatch_reason(self):
        q = make_q(stem="What is water?", difficulty="hard")
        res = analyze_difficulty(q, ctx(requested_difficulty="hard"))
        assert res.match is False
        assert "reads as" in res.reason


# ── Task 6: Distractors (warnings only) ──────────────────────────────────────
class TestDistractors:
    def test_clean_options_no_warnings(self):
        q = make_q(
            options=[
                ("A", "apple pie", False),
                ("B", "banana cake", True),
                ("C", "cherry tart", False),
                ("D", "date pudding", False),
            ]
        )
        assert analyze_distractors(q).warnings == []

    def test_very_short_option(self):
        q = make_q(options=[("A", "x", False), ("B", "one", True), ("C", "two", False), ("D", "three", False)])
        codes = [w.code for w in analyze_distractors(q).warnings]
        assert "very_short_option" in codes

    def test_obvious_filler(self):
        q = make_q(
            options=[
                ("A", "apple", False),
                ("B", "banana", True),
                ("C", "cherry", False),
                ("D", "all of the above", False),
            ]
        )
        codes = [w.code for w in analyze_distractors(q).warnings]
        assert "obvious_filler_option" in codes

    def test_correct_answer_too_obvious(self):
        q = make_q(
            options=[
                ("A", "no", False),
                ("B", "this is a very long and detailed correct answer option indeed", True),
                ("C", "no", False),
                ("D", "no", False),
            ]
        )
        codes = [w.code for w in analyze_distractors(q).warnings]
        assert "correct_answer_too_obvious" in codes

    def test_near_duplicate_options(self):
        q = make_q(
            options=[
                ("A", "the mitochondria organelle", False),
                ("B", "the mitochondria organelles", False),
                ("C", "the nucleus of a cell", True),
                ("D", "a ribosome structure here", False),
            ],
            correct="C",
        )
        codes = [w.code for w in analyze_distractors(q).warnings]
        assert "near_duplicate_options" in codes

    def test_uniform_length(self):
        q = make_q(
            options=[
                ("A", "aaa", False),
                ("B", "bbb", True),
                ("C", "ccc", False),
                ("D", "ddd", False),
            ]
        )
        codes = [w.code for w in analyze_distractors(q).warnings]
        assert "uniform_option_length" in codes


# ── Task 7: Explanation (warnings only) ──────────────────────────────────────
class TestExplanation:
    def test_good_explanation_no_warnings(self):
        q = make_q(
            explanation="One plus one equals two because each unit adds to the total sum.",
            options=[("A", "zero", False), ("B", "two", True), ("C", "three", False), ("D", "four", False)],
            correct="B",
        )
        assert analyze_explanation(q).warnings == []

    def test_too_short(self):
        q = make_q(explanation="Because yes.")
        codes = [w.code for w in analyze_explanation(q).warnings]
        assert "explanation_too_short" in codes

    def test_copies_stem(self):
        q = make_q(
            stem="What is one half plus one half in fractions?",
            explanation="What is one half plus one half in fractions exactly?",
        )
        codes = [w.code for w in analyze_explanation(q).warnings]
        assert "explanation_copies_stem" in codes

    def test_missing_reasoning(self):
        q = make_q(
            stem="Which planet is closest to the sun in our solar system today?",
            explanation="The planet nearest is a small rocky world orbiting quickly around.",
            options=[("A", "Mercury", True), ("B", "Venus", False), ("C", "Mars", False), ("D", "Earth", False)],
            correct="A",
        )
        codes = [w.code for w in analyze_explanation(q).warnings]
        assert "explanation_missing_reasoning" in codes


# ── Task 8: Scoring ──────────────────────────────────────────────────────────
class TestScoring:
    def _run(self, question, corpus=None, context=None, warnings=None):
        svc = AIQualityAnalysisService(
            corpus_provider=lambda **kw: corpus or [], config=CFG
        )
        return svc.analyze(
            validated=make_validated(question, warnings=warnings),
            context=context or ctx(),
        )

    def test_clean_question_scores_high(self):
        q = make_q(
            stem="Add the fractions one half and one half together now.",
            explanation="One half plus one half equals one because the parts combine fully.",
            options=[("A", "zero apples", False), ("B", "one whole", True), ("C", "two pears", False), ("D", "three plums", False)],
            tags=["fractions"],
            difficulty="easy",
        )
        # Context matches the question (easy, apply, Fractions) → no mismatch penalties.
        res = self._run(q, context=ctx(requested_difficulty="easy", requested_bloom="apply"))
        assert res.quality_score >= 90
        assert res.quality_grade == "A"
        assert res.strengths
        assert res.duplicate.classification == "unique"

    def test_exact_duplicate_penalised(self):
        q = make_q(stem="What is the capital of France?")
        corpus = [CorpusEntry("q1", "What is the capital of France?", "published")]
        res = self._run(q, corpus=corpus)
        assert res.duplicate.classification == "exact_duplicate"
        assert res.quality_score <= 60  # heavy penalty
        assert any(w["code"] == "duplicate_exact" for w in res.to_dict()["warnings"])
        assert res.recommendations

    def test_grade_bands_and_clamp(self):
        # Pile on mismatches to drive the score toward F without ever raising.
        q = make_q(
            stem="x",  # misaligned, easy, short
            explanation="no",  # too short
            difficulty="hard",
            bloom="create",
            options=[("A", "a", False), ("B", "b", True), ("C", "c", False), ("D", "d", False)],
            tags=[],
            learning_objective="",
        )
        res = self._run(
            q,
            context=ctx(topic="Photosynthesis", subject="Biology", requested_bloom="remember", requested_difficulty="hard"),
            warnings=[ValidationIssue("tags_empty", "warning", "tags", "No tags")],
        )
        assert 0 <= res.quality_score <= 100
        assert res.quality_grade in {"D", "F"}

    def test_report_is_json_serialisable(self):
        import json

        res = self._run(make_q())
        json.dumps(res.to_dict())  # must not raise
        assert set(res.to_dict()) >= {
            "quality_score",
            "quality_grade",
            "duplicate",
            "alignment",
            "bloom",
            "difficulty",
            "distractors",
            "explanation",
            "strengths",
            "warnings",
            "recommendations",
            "analysis_version",
        }
