"""
AIReviewAssistantService tests (Sprint-6B-04).

Recommendations, per-action improvement, version creation, quality comparison,
audit, credit enforcement, and permission-style guards. No live AI: generation is
driven through a stubbed gateway function and quality uses an empty injected corpus;
the credit-protocol test uses the REAL gateway with a stubbed provider adapter.
"""
import json
from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from ai.enums import PromptType
from ai.generation.exceptions import (
    DraftNotFoundError,
    DraftNotRegenerableError,
    DraftRegenerationInvalidError,
)
from ai.generation.service import QuestionGenerationService
from ai.models import AIDraftRegeneration, DraftStatus
from ai.quality import AIQualityAnalysisService
from ai.review import AIReviewAssistantService, ReviewAction
from ai.selectors import list_draft_regenerations
from ai.services.gateway import AIResult
from ai.tests.factories import AIQuestionDraftFactory
from ai.tests.generation_utils import question_dict
from ai.validation.dto import ValidatedQuestion, ValidationIssue, ValidationResult

pytestmark = pytest.mark.django_db


class RecordingGenerate:
    """Gateway ``generate`` stand-in: returns a scripted question, records kwargs."""

    def __init__(self, question=None, provider="mock", model="mock-model", usage=None):
        self._question = question or question_dict()
        self._provider = provider
        self._model = model
        self._usage = usage or {}
        self.calls: list[dict] = []

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        return AIResult(
            success=True,
            prompt_type=str(kwargs.get("prompt_type")),
            provider=self._provider,
            model=self._model,
            text=json.dumps({"questions": [self._question]}),
            request_id="req-improve",
            **self._usage,
        )

    @property
    def last_call(self) -> dict:
        return self.calls[-1]


class StubValidation:
    def __init__(self, valid=True):
        self._valid = valid

    def validate(self, question):
        errors = [] if self._valid else [ValidationIssue("bad", "error", "stem", "no")]
        return ValidatedQuestion(
            normalized_question=question,
            result=ValidationResult(valid=self._valid, errors=errors, warnings=[]),
        )


def _service(question=None, *, valid=True, provider="mock", model="mock-model", usage=None):
    gen = QuestionGenerationService(
        generate_fn=RecordingGenerate(
            question=question, provider=provider, model=model, usage=usage
        )
    )
    return AIReviewAssistantService(
        generation_service=gen,
        validation_service=StubValidation(valid=valid),
        quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: []),
    )


# ── Task 5: Recommendations ──────────────────────────────────────────────────
class TestRecommendations:
    def test_recommends_explanation_for_short_explanation(self):
        draft = AIQuestionDraftFactory(explanation="Too short.")
        recs = AIReviewAssistantService(
            quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: [])
        ).recommend(draft_id=draft.id)
        actions = {r.suggested_action for r in recs.recommendations}
        assert ReviewAction.IMPROVE_EXPLANATION.value in actions
        assert recs.quality_score is not None

    def test_missing_draft_raises(self):
        import uuid

        with pytest.raises(DraftNotFoundError):
            AIReviewAssistantService().recommend(draft_id=uuid.uuid4())

    def test_maps_all_quality_signals_to_actions(self, monkeypatch):
        draft = AIQuestionDraftFactory(learning_objective="")
        svc = AIReviewAssistantService(
            quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: [])
        )

        class _Poor:
            class duplicate:  # noqa: N801
                classification = "near_duplicate"

            class alignment:  # noqa: N801
                status = "misaligned"
                reason = "no overlap"

            class bloom:  # noqa: N801
                status = "higher"

            class difficulty:  # noqa: N801
                match = False
                estimated = "hard"
                requested = "easy"

            class distractors:  # noqa: N801
                warnings = [object()]

            class explanation:  # noqa: N801
                warnings = [object()]

            quality_score = 40
            quality_grade = "F"

        monkeypatch.setattr(svc, "_analyze_current", lambda draft: _Poor)
        recs = svc.recommend(draft_id=draft.id)
        actions = {r.suggested_action for r in recs.recommendations}
        assert ReviewAction.IMPROVE_EXPLANATION.value in actions
        assert ReviewAction.IMPROVE_LEARNING_OBJECTIVE.value in actions
        assert ReviewAction.IMPROVE_DISTRACTORS.value in actions
        assert ReviewAction.REDUCE_DIFFICULTY.value in actions  # estimated harder than requested
        assert ReviewAction.IMPROVE_BLOOM.value in actions
        assert ReviewAction.ADD_SCENARIO.value in actions  # possible duplicate
        assert ReviewAction.REWRITE_STEM.value in actions  # weak alignment

    def test_strong_draft_returns_info_only(self, monkeypatch):
        # Force a pristine analysis → the "looks_good" info recommendation.
        draft = AIQuestionDraftFactory()
        svc = AIReviewAssistantService(
            quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: [])
        )

        class _Perfect:
            class duplicate:  # noqa: N801
                classification = "unique"

            class alignment:  # noqa: N801
                status = "aligned"
                reason = ""

            class bloom:  # noqa: N801
                status = "match"

            class difficulty:  # noqa: N801
                match = True
                estimated = "medium"
                requested = "medium"

            class distractors:  # noqa: N801
                warnings: list = []

            class explanation:  # noqa: N801
                warnings: list = []

            quality_score = 100
            quality_grade = "A"

        monkeypatch.setattr(svc, "_analyze_current", lambda draft: _Perfect)
        # Give the draft a learning objective so that rule doesn't fire.
        draft.learning_objective = "Objective."
        recs = svc.recommend(draft_id=draft.id)
        assert [r.code for r in recs.recommendations] == ["looks_good"]


# ── Tasks 1/3: Improvement + version creation ────────────────────────────────
class TestImprove:
    def test_creates_new_version_and_updates_draft(self):
        user = UserFactory()
        draft = AIQuestionDraftFactory(created_by=user, stem="Old stem?")
        improved = question_dict(stem="Improved, clearer stem?")

        outcome = _service(improved).improve(
            draft_id=draft.id,
            action=ReviewAction.REWRITE_STEM.value,
            created_by=user,
        )

        draft.refresh_from_db()
        assert draft.stem == "Improved, clearer stem?"
        assert draft.current_version == 2
        assert draft.regeneration_count == 1
        # History has the bootstrapped original (v1) + the improvement (v2).
        versions = list(list_draft_regenerations(draft_id=draft.id))
        assert [v.version for v in versions] == [1, 2]
        assert outcome.regeneration.version == 2
        assert outcome.regeneration.review_action == ReviewAction.REWRITE_STEM.value

    @pytest.mark.parametrize(
        "action,prompt_type",
        [
            (ReviewAction.IMPROVE_EXPLANATION.value, PromptType.REVIEW_IMPROVE_EXPLANATION),
            (ReviewAction.ADD_SCENARIO.value, PromptType.REVIEW_ADD_SCENARIO),
            (ReviewAction.SIMPLIFY_LANGUAGE.value, PromptType.REVIEW_SIMPLIFY_LANGUAGE),
        ],
    )
    def test_action_maps_to_prompt_type(self, action, prompt_type):
        draft = AIQuestionDraftFactory()
        gen = RecordingGenerate()
        svc = AIReviewAssistantService(
            generation_service=QuestionGenerationService(generate_fn=gen),
            validation_service=StubValidation(),
            quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: []),
        )
        svc.improve(draft_id=draft.id, action=action)
        assert gen.last_call["prompt_type"] == prompt_type

    def test_provider_override_forwarded(self):
        draft = AIQuestionDraftFactory()
        gen = RecordingGenerate(provider="openai")
        svc = AIReviewAssistantService(
            generation_service=QuestionGenerationService(generate_fn=gen),
            validation_service=StubValidation(),
            quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: []),
        )
        svc.improve(draft_id=draft.id, action=ReviewAction.REWRITE_STEM.value, provider="openai")
        assert gen.last_call["provider"] == "openai"

    def test_instructions_augment_prompt_and_stored(self):
        draft = AIQuestionDraftFactory()
        outcome = _service().improve(
            draft_id=draft.id,
            action=ReviewAction.REDUCE_AMBIGUITY.value,
            instructions="  Focus on option C  ",
        )
        assert outcome.regeneration.feedback == "Focus on option C"
        assert "Focus on option C" in outcome.regeneration.generation_prompt

    def test_unknown_action_raises(self):
        draft = AIQuestionDraftFactory()
        with pytest.raises(ValueError):
            _service().improve(draft_id=draft.id, action="not_an_action")

    def test_non_generated_draft_rejected(self):
        draft = AIQuestionDraftFactory(status=DraftStatus.IMPORTED)
        with pytest.raises(DraftNotRegenerableError):
            _service().improve(draft_id=draft.id, action=ReviewAction.REWRITE_STEM.value)

    def test_invalid_improvement_preserves_draft(self):
        draft = AIQuestionDraftFactory(stem="Keep me")
        with pytest.raises(DraftRegenerationInvalidError):
            _service(valid=False).improve(
                draft_id=draft.id, action=ReviewAction.IMPROVE_EXPLANATION.value
            )
        draft.refresh_from_db()
        assert draft.stem == "Keep me"
        assert AIDraftRegeneration.objects.filter(draft=draft).count() == 0


# ── Task 4: Quality comparison ───────────────────────────────────────────────
class TestQualityComparison:
    def test_comparison_returned_and_stored(self):
        draft = AIQuestionDraftFactory(explanation="Short.")
        improved = question_dict(
            explanation="This is a fuller explanation because the reasoning is spelled out clearly."
        )
        outcome = _service(improved).improve(
            draft_id=draft.id, action=ReviewAction.IMPROVE_EXPLANATION.value
        )
        comp = outcome.comparison
        assert isinstance(comp.old_score, int) and isinstance(comp.new_score, int)
        assert comp.quality_delta == comp.new_score - comp.old_score
        # before/after quality reports are persisted on the immutable version row.
        row = outcome.regeneration
        assert row.quality_before and row.quality_after
        assert row.quality_after["quality_score"] == comp.new_score
        # The draft's quality columns are refreshed to the new analysis.
        draft.refresh_from_db()
        assert draft.quality_score == comp.new_score


# ── Task 8: Audit ────────────────────────────────────────────────────────────
class TestAudit:
    def test_records_full_audit(self):
        user = UserFactory()
        draft = AIQuestionDraftFactory(created_by=user)
        usage = {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30,
            "cost": Decimal("0.25"),
        }
        outcome = _service(
            provider="openai", model="gpt-4o-mini", usage=usage
        ).improve(
            draft_id=draft.id,
            action=ReviewAction.IMPROVE_DISTRACTORS.value,
            instructions="make them plausible",
            created_by=user,
        )
        row = outcome.regeneration
        assert row.review_action == ReviewAction.IMPROVE_DISTRACTORS.value
        assert row.feedback == "make them plausible"
        assert row.generation_prompt  # review_prompt
        assert row.provider == "openai" and row.model == "gpt-4o-mini"
        assert row.total_tokens == 30 and row.cost == Decimal("0.25")
        assert row.created_by == user
        assert row.quality_before and row.quality_after


# ── Task 7: Credits (real gateway, stubbed provider) ─────────────────────────
class TestCredits:
    @pytest.fixture(autouse=True)
    def _cfg(self, settings, monkeypatch):
        settings.AI_PROVIDER_CHAIN = ["p1"]
        settings.AI_DEFAULT_MODELS = {"p1": "m1"}
        settings.AI_MODELS = {}
        settings.AI_MAX_RETRIES = 0
        settings.AI_TOKEN_PRICING = {}
        settings.AI_CREDIT_COSTS = {"review_rewrite_stem": "2"}
        monkeypatch.setattr("ai.services.gateway.time.sleep", lambda *_: None)

    def test_success_commits_credits(self, monkeypatch):
        from ai.providers.base import ProviderResponse
        from credits.selectors import get_credit_balance
        from credits.services import grant_credits

        class _Ok:
            def complete(self, **kwargs):
                return ProviderResponse(
                    text=json.dumps({"questions": [question_dict(stem="better")]}),
                    model="m1",
                    prompt_tokens=3,
                    completion_tokens=4,
                )

        monkeypatch.setattr(
            "ai.services.gateway.build_provider", lambda name, *, http_client=None: _Ok()
        )
        user = UserFactory()
        grant_credits(user=user, amount=Decimal("10"))
        draft = AIQuestionDraftFactory(created_by=user)

        AIReviewAssistantService(
            quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: [])
        ).improve(
            draft_id=draft.id, action=ReviewAction.REWRITE_STEM.value, created_by=user
        )

        bal = get_credit_balance(user=user)
        assert bal.available_credits == Decimal("8.00")  # 2 credits committed
        assert bal.reserved_credits == Decimal("0.00")

    def test_provider_failure_releases_credits(self, monkeypatch):
        from ai.exceptions import ProviderResponseError
        from ai.generation.exceptions import ProviderUnavailableError
        from credits.models import CreditLedger
        from credits.selectors import get_credit_balance
        from credits.services import grant_credits

        class _Fail:
            def complete(self, **kwargs):
                raise ProviderResponseError("400", retryable=False)

        monkeypatch.setattr(
            "ai.services.gateway.build_provider", lambda name, *, http_client=None: _Fail()
        )
        user = UserFactory()
        grant_credits(user=user, amount=Decimal("10"))
        draft = AIQuestionDraftFactory(created_by=user)

        with pytest.raises(ProviderUnavailableError):
            AIReviewAssistantService(
                quality_service=AIQualityAnalysisService(corpus_provider=lambda **kw: [])
            ).improve(
                draft_id=draft.id, action=ReviewAction.REWRITE_STEM.value, created_by=user
            )

        bal = get_credit_balance(user=user)
        assert bal.available_credits == Decimal("10.00")  # released
        assert CreditLedger.objects.filter(user=user, transaction_type="release").exists()
        draft.refresh_from_db()
        assert draft.regeneration_count == 0
