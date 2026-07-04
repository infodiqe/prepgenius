"""
AIQualityAnalysisService (Sprint-6B-03, Task 1).

Provider-independent orchestration of the rule-based analyzers. Input is a
:class:`ai.validation.dto.ValidatedQuestion` (analysis runs strictly AFTER
validation) plus a :class:`QualityContext`; output is a single
:class:`QualityAnalysisResult`. It NEVER calls a provider and NEVER rejects,
edits, approves, or publishes — it only produces advisory quality metadata.

The duplicate-detection corpus reader is injected (default: the DB selector) so
the service is unit-testable without any question/exam fixtures.
"""
from __future__ import annotations

from typing import Callable

from ai.quality import analyzers
from ai.quality.config import QualityConfig, quality_config
from ai.quality.dto import (
    CorpusEntry,
    QualityAnalysisResult,
    QualityContext,
)
from ai.validation.dto import ValidatedQuestion

CorpusProvider = Callable[..., list[CorpusEntry]]


def _default_corpus_provider(**kwargs) -> list[CorpusEntry]:
    # Imported lazily so importing the service never pulls in the ORM/selectors.
    from ai.selectors.quality_selectors import get_duplicate_candidates

    return get_duplicate_candidates(**kwargs)


class AIQualityAnalysisService:
    def __init__(
        self,
        corpus_provider: CorpusProvider | None = None,
        config: QualityConfig | None = None,
    ) -> None:
        self._corpus_provider = corpus_provider or _default_corpus_provider
        self._config = config or quality_config()

    def analyze(
        self, *, validated: ValidatedQuestion, context: QualityContext
    ) -> QualityAnalysisResult:
        question = validated.normalized_question
        cfg = self._config

        corpus = self._corpus_provider(
            exam=context.exam,
            language=context.language,
            exclude_draft_id=context.exclude_draft_id,
            limit=cfg.corpus_limit,
        )

        duplicate = analyzers.analyze_duplicates(question, corpus, cfg)
        alignment = analyzers.analyze_alignment(question, context)
        bloom = analyzers.analyze_bloom(question, context)
        difficulty = analyzers.analyze_difficulty(question, context)
        distractors = analyzers.analyze_distractors(question)
        explanation = analyzers.analyze_explanation(question)

        score, grade, strengths, warnings, recommendations = analyzers.score_quality(
            validated,
            duplicate,
            alignment,
            bloom,
            difficulty,
            distractors,
            explanation,
        )

        return QualityAnalysisResult(
            quality_score=score,
            quality_grade=grade,
            duplicate=duplicate,
            alignment=alignment,
            bloom=bloom,
            difficulty=difficulty,
            distractors=distractors,
            explanation=explanation,
            strengths=strengths,
            warnings=warnings,
            recommendations=recommendations,
            analysis_version=cfg.analysis_version,
        )
