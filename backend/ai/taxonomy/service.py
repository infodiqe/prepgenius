"""
AITaxonomyResolutionService (Sprint-6C-01).

Before a reviewer imports an AI draft, resolve its free-text taxonomy context
(exam / subject / topic / subtopic) to real ``exams`` records so the reviewer has a
head start. Fully **deterministic — no AI call** (Task 1): exact matches on
code/slug/name first, then trigram similarity (reused from the 6B-03 quality
engine). It also runs the pre-import duplicate check (Task 4) by reusing the same
duplicate corpus + analyzer, and applies an accepted decision through the EXISTING
:class:`AIQuestionImportService` (Task 5), recording an append-only audit (Task 6).

The reviewer always decides: nothing is auto-imported and no taxonomy is auto-updated.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from django.db import transaction

from ai.generation.exceptions import DraftNotFoundError
from ai.generation.import_service import AIQuestionImportService
from ai.generation.regeneration_service import draft_to_generated_question
from ai.quality.analyzers import analyze_duplicates
from ai.quality.config import quality_config
from ai.quality.similarity import trigram_similarity
from ai.selectors import get_ai_draft, get_duplicate_candidates
from ai.taxonomy.config import TaxonomyConfig, taxonomy_config
from ai.taxonomy.dto import (
    LevelSuggestion,
    TaxonomyAcceptOutcome,
    TaxonomyMatch,
    TaxonomyResolution,
)
from ai.taxonomy.enums import MatchConfidence
from exams.selectors.exam_selectors import (
    list_exams,
    list_subjects_for_exam,
    list_subtopics_for_topic,
    list_topics_for_subject,
)


def _match_level(
    *, level: str, query: str | None, candidates: list[tuple], cfg: TaxonomyConfig
) -> LevelSuggestion:
    """
    Score ``query`` against ``candidates`` — each ``(id, label, match_strings)`` —
    exact first (case-insensitive on any match string), else best trigram similarity.
    Returns the top ``max_matches`` sorted by score, with a confidence verdict.
    """
    q = (query or "").strip()
    if not q or not candidates:
        return LevelSuggestion(level=level, query=q, confidence=MatchConfidence.NO_MATCH.value, best=None, matches=[])

    q_norm = q.casefold()
    scored: list[TaxonomyMatch] = []
    for cid, label, strings in candidates:
        clean = [s.strip() for s in strings if s]
        exact = any(s.casefold() == q_norm for s in clean)
        best_sim = max((trigram_similarity(q, s) for s in clean), default=0.0)
        if exact:
            confidence, score, reason = MatchConfidence.EXACT.value, 1.0, "Exact name/code match."
        elif best_sim >= cfg.partial_threshold:
            confidence, score, reason = (
                MatchConfidence.PARTIAL.value,
                best_sim,
                f"Closest name similarity {best_sim:.0%}.",
            )
        else:
            confidence, score, reason = (
                MatchConfidence.NO_MATCH.value,
                best_sim,
                "No sufficiently similar taxonomy entry.",
            )
        scored.append(TaxonomyMatch(str(cid), label, confidence, score, reason))

    scored.sort(key=lambda m: m.score, reverse=True)
    top = scored[: cfg.max_matches]
    best = top[0] if top else None
    confidence = best.confidence if best else MatchConfidence.NO_MATCH.value
    return LevelSuggestion(level=level, query=q, confidence=confidence, best=best, matches=top)


def _overall_confidence(exam: LevelSuggestion, subtopic: LevelSuggestion) -> str:
    """Weakest-link summary over the two levels the import requires."""
    order = {
        MatchConfidence.NO_MATCH.value: 0,
        MatchConfidence.PARTIAL.value: 1,
        MatchConfidence.EXACT.value: 2,
    }
    return min(exam.confidence, subtopic.confidence, key=lambda c: order.get(c, 0))


class AITaxonomyResolutionService:
    def __init__(
        self,
        import_service: AIQuestionImportService | None = None,
        config: TaxonomyConfig | None = None,
    ) -> None:
        self._import = import_service or AIQuestionImportService()
        self._config = config or taxonomy_config()

    # ── Tasks 1/2/4: resolve suggestions + duplicate check ───────────────────
    def resolve(self, *, draft) -> TaxonomyResolution:
        cfg = self._config

        exam_sug = _match_level(
            level="exam", query=draft.exam, candidates=self._exam_candidates(), cfg=cfg
        )
        chosen_exam_id = self._picked_id(exam_sug)

        subject_sug = _match_level(
            level="subject",
            query=draft.subject,
            candidates=self._subject_candidates(chosen_exam_id),
            cfg=cfg,
        )
        chosen_subject_id = self._picked_id(subject_sug)

        topic_sug = _match_level(
            level="topic",
            query=draft.topic,
            candidates=self._topic_candidates(chosen_subject_id),
            cfg=cfg,
        )
        chosen_topic_id = self._picked_id(topic_sug)

        subtopic_sug = _match_level(
            level="subtopic",
            query=draft.subtopic,
            candidates=self._subtopic_candidates(chosen_topic_id),
            cfg=cfg,
        )

        return TaxonomyResolution(
            draft_id=str(draft.id),
            exam=exam_sug,
            subject=subject_sug,
            topic=topic_sug,
            subtopic=subtopic_sug,
            overall_confidence=_overall_confidence(exam_sug, subtopic_sug),
            duplicates=self._duplicates(draft),
        )

    # ── Tasks 5/6: accept + import (reuse existing import service) ────────────
    def accept_and_import(
        self,
        *,
        draft_id: UUID,
        exam_id: UUID,
        subtopic_id: UUID,
        created_by: Any | None = None,
    ) -> TaxonomyAcceptOutcome:
        from ai.models import AITaxonomyResolution

        draft = get_ai_draft(draft_id=draft_id)
        if draft is None:
            raise DraftNotFoundError(str(draft_id))

        # Snapshot the suggestion at accept time to record what was proposed and
        # whether the reviewer overrode it.
        resolution = self.resolve(draft=draft)
        is_override = (
            str(exam_id) != (resolution.suggested_exam_id or "")
            or str(subtopic_id) != (resolution.suggested_subtopic_id or "")
        )

        with transaction.atomic():
            # Import through the EXISTING service — no duplicate import code. It
            # validates the exam/subtopic refs and marks the draft imported.
            import_result = self._import.import_draft(
                draft_id=draft_id,
                exam_id=exam_id,
                subtopic_id=subtopic_id,
                created_by=created_by,
            )
            audit = AITaxonomyResolution.objects.create(
                draft=draft,
                suggested_exam_id=resolution.suggested_exam_id or None,
                suggested_subtopic_id=resolution.suggested_subtopic_id or None,
                confidence=resolution.overall_confidence,
                suggestion=resolution.to_dict(),
                chosen_exam_id=exam_id,
                chosen_subtopic_id=subtopic_id,
                is_override=is_override,
                imported_question_id=import_result.question_id,
                created_by=created_by,
            )

        return TaxonomyAcceptOutcome(import_result=import_result, audit=audit)

    # ── Candidate builders (reuse exams selectors) ───────────────────────────
    @staticmethod
    def _exam_candidates() -> list[tuple]:
        return [
            (e.id, f"{e.code} — {e.name}", [e.code, e.name, e.slug or ""])
            for e in list_exams()
        ]

    @staticmethod
    def _subject_candidates(exam_id) -> list[tuple]:
        if exam_id is None:
            return []
        return [(s.id, s.name, [s.name]) for s in list_subjects_for_exam(exam_id=exam_id)]

    @staticmethod
    def _topic_candidates(subject_id) -> list[tuple]:
        if subject_id is None:
            return []
        return [
            (t.id, t.name, [t.name]) for t in list_topics_for_subject(subject_id=subject_id)
        ]

    @staticmethod
    def _subtopic_candidates(topic_id) -> list[tuple]:
        if topic_id is None:
            return []
        return [
            (st.id, st.name, [st.name])
            for st in list_subtopics_for_topic(topic_id=topic_id)
        ]

    @staticmethod
    def _picked_id(level: LevelSuggestion):
        if level.best is not None and level.best.confidence != MatchConfidence.NO_MATCH.value:
            return level.best.id
        return None

    @staticmethod
    def _duplicates(draft) -> dict:
        # Reuse the 6B-03 duplicate corpus + analyzer (published / imported-AI /
        # other drafts). No taxonomy or similarity logic is duplicated here.
        question = draft_to_generated_question(draft)
        corpus = get_duplicate_candidates(
            exam=draft.exam, exclude_draft_id=draft.id, limit=quality_config().corpus_limit
        )
        return analyze_duplicates(question, corpus, quality_config()).to_dict()
