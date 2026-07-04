"""
DraftRegenerationService tests (Sprint-6B-02).

Cover regenerate success / failure, versioning + history, rollback, version
comparison, provider override forwarding, feedback injection, and credit rollback.
No live AI: generation is driven through a stubbed gateway function, and the one
credit-protocol test uses the REAL gateway with a stubbed provider adapter.
"""
import json
from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from ai.generation.exceptions import (
    DraftNotFoundError,
    DraftNotRegenerableError,
    DraftRegenerationInvalidError,
    RegenerationVersionNotFoundError,
)
from ai.generation.regeneration_service import DraftRegenerationService
from ai.generation.service import QuestionGenerationService
from ai.models import AIDraftRegeneration, DraftStatus
from ai.selectors import compare_draft_versions, list_draft_regenerations
from ai.services.gateway import AIResult
from ai.tests.factories import AIQuestionDraftFactory
from ai.tests.generation_utils import question_dict
from ai.validation.dto import (
    ValidatedQuestion,
    ValidationIssue,
    ValidationResult,
)

pytestmark = pytest.mark.django_db


# ── Doubles ──────────────────────────────────────────────────────────────────
class RecordingGenerate:
    """Gateway ``generate`` stand-in: returns scripted content, records kwargs."""

    def __init__(self, *questions, provider="mock", model="mock-model", usage=None):
        self._questions = list(questions) or [question_dict()]
        self._provider = provider
        self._model = model
        self._usage = usage or {}
        self.calls: list[dict] = []

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        text = json.dumps({"questions": self._questions})
        return AIResult(
            success=True,
            prompt_type="question_generation",
            provider=self._provider,
            model=self._model,
            text=text,
            request_id="req-xyz",
            **self._usage,
        )

    @property
    def last_call(self) -> dict:
        return self.calls[-1]


class StubValidation:
    """Validation service stand-in with a fixed verdict."""

    def __init__(self, valid=True):
        self._valid = valid

    def validate(self, question):
        errors = (
            []
            if self._valid
            else [ValidationIssue("bad", "error", "stem", "nope")]
        )
        return ValidatedQuestion(
            normalized_question=question,
            result=ValidationResult(valid=self._valid, errors=errors, warnings=[]),
        )


def _service(*questions, valid=True, provider="mock", model="mock-model", usage=None):
    gen = QuestionGenerationService(
        generate_fn=RecordingGenerate(
            *questions, provider=provider, model=model, usage=usage
        )
    )
    return DraftRegenerationService(
        generation_service=gen, validation_service=StubValidation(valid=valid)
    )


# ── Regenerate success + versioning ──────────────────────────────────────────
class TestRegenerateSuccess:
    def test_replaces_ai_fields_and_preserves_identity(self):
        user = UserFactory()
        draft = AIQuestionDraftFactory(created_by=user)
        original_id, original_created = draft.id, draft.created_at
        improved = question_dict(stem="Improved stem?", difficulty="hard")

        outcome = _service(improved).regenerate(draft_id=draft.id, created_by=user)

        draft.refresh_from_db()
        # AI fields replaced.
        assert draft.stem == "Improved stem?"
        assert draft.difficulty == "hard"
        # Identity / audit preserved.
        assert draft.id == original_id
        assert draft.created_at == original_created
        assert draft.created_by == user
        assert draft.status == DraftStatus.GENERATED
        # Version bookkeeping.
        assert draft.regeneration_count == 1
        assert draft.current_version == 2
        assert draft.regenerated_at is not None
        assert outcome.regeneration.version == 2

    def test_bootstraps_original_as_version_1(self):
        draft = AIQuestionDraftFactory()
        _service(question_dict(stem="v2")).regenerate(draft_id=draft.id)

        history = list(list_draft_regenerations(draft_id=draft.id))
        assert [h.version for h in history] == [1, 2]
        v1, v2 = history
        assert v1.is_original is True
        assert v1.stem == "What is 2 + 2?"  # the factory's original content
        assert v2.is_original is False
        assert v2.stem == "v2"

    def test_second_regeneration_increments_version(self):
        draft = AIQuestionDraftFactory()
        svc = _service(question_dict(stem="v2"))
        svc.regenerate(draft_id=draft.id)
        _service(question_dict(stem="v3")).regenerate(draft_id=draft.id)

        draft.refresh_from_db()
        assert draft.current_version == 3
        assert draft.regeneration_count == 2
        assert [h.version for h in list_draft_regenerations(draft_id=draft.id)] == [1, 2, 3]


# ── Regenerate failure ───────────────────────────────────────────────────────
class TestRegenerateFailure:
    def test_missing_draft_raises(self):
        import uuid

        with pytest.raises(DraftNotFoundError):
            _service().regenerate(draft_id=uuid.uuid4())

    @pytest.mark.parametrize("state", [DraftStatus.IMPORTED, DraftStatus.DISCARDED])
    def test_non_generated_draft_rejected(self, state):
        draft = AIQuestionDraftFactory(status=state)
        with pytest.raises(DraftNotRegenerableError):
            _service().regenerate(draft_id=draft.id)

    def test_invalid_regeneration_preserves_draft(self):
        draft = AIQuestionDraftFactory()
        before = draft.stem
        with pytest.raises(DraftRegenerationInvalidError):
            _service(question_dict(stem="rejected"), valid=False).regenerate(
                draft_id=draft.id
            )

        draft.refresh_from_db()
        assert draft.stem == before  # unchanged
        assert draft.regeneration_count == 0
        assert AIDraftRegeneration.objects.filter(draft=draft).count() == 0

    def test_provider_failure_preserves_draft(self):
        from ai.generation.exceptions import ProviderUnavailableError

        draft = AIQuestionDraftFactory()
        gen = QuestionGenerationService(
            generate_fn=lambda **kw: AIResult(
                success=False,
                prompt_type="question_generation",
                error="all providers failed",
            )
        )
        svc = DraftRegenerationService(
            generation_service=gen, validation_service=StubValidation()
        )
        with pytest.raises(ProviderUnavailableError):
            svc.regenerate(draft_id=draft.id)

        draft.refresh_from_db()
        assert draft.regeneration_count == 0
        assert AIDraftRegeneration.objects.filter(draft=draft).count() == 0


# ── Feedback injection (Task 2) ──────────────────────────────────────────────
class TestFeedbackInjection:
    def test_feedback_augments_prompt_and_is_stored(self):
        draft = AIQuestionDraftFactory()
        gen = RecordingGenerate(question_dict(stem="v2"))
        svc = DraftRegenerationService(
            generation_service=QuestionGenerationService(generate_fn=gen),
            validation_service=StubValidation(),
        )
        outcome = svc.regenerate(draft_id=draft.id, feedback="  Make harder  ")

        # Feedback flows into the prompt payload (never replaces the system prompt).
        assert gen.last_call["payload"]["additional_instructions"] == "Make harder"
        # Stored on the version record (feedback history).
        assert outcome.regeneration.feedback == "Make harder"
        assert "Make harder" in outcome.regeneration.generation_prompt
        # The bootstrapped original carries no feedback.
        v1 = list_draft_regenerations(draft_id=draft.id).first()
        assert v1.feedback == ""

    def test_blank_feedback_normalized_to_empty(self):
        draft = AIQuestionDraftFactory()
        outcome = _service(question_dict(stem="v2")).regenerate(
            draft_id=draft.id, feedback="   "
        )
        assert outcome.regeneration.feedback == ""


# ── Provider override (Task 5) ───────────────────────────────────────────────
class TestProviderOverride:
    def test_explicit_provider_forwarded_to_gateway(self):
        draft = AIQuestionDraftFactory()
        gen = RecordingGenerate(question_dict(stem="v2"), provider="openai")
        svc = DraftRegenerationService(
            generation_service=QuestionGenerationService(generate_fn=gen),
            validation_service=StubValidation(),
        )
        svc.regenerate(draft_id=draft.id, provider="openai")
        assert gen.last_call["provider"] == "openai"

    def test_auto_maps_to_no_override(self):
        draft = AIQuestionDraftFactory()
        gen = RecordingGenerate(question_dict(stem="v2"))
        svc = DraftRegenerationService(
            generation_service=QuestionGenerationService(generate_fn=gen),
            validation_service=StubValidation(),
        )
        svc.regenerate(draft_id=draft.id, provider="auto")
        assert gen.last_call["provider"] is None


# ── Audit / usage capture (Task 3, 7) ────────────────────────────────────────
class TestAudit:
    def test_records_who_provider_model_tokens_cost(self):
        user = UserFactory()
        draft = AIQuestionDraftFactory(created_by=user)
        usage = {
            "prompt_tokens": 11,
            "completion_tokens": 22,
            "total_tokens": 33,
            "cost": Decimal("0.5"),
        }
        outcome = _service(
            question_dict(stem="v2"), provider="openai", model="gpt-4o-mini", usage=usage
        ).regenerate(draft_id=draft.id, created_by=user)

        row = outcome.regeneration
        assert row.created_by == user
        assert row.provider == "openai"
        assert row.model == "gpt-4o-mini"
        assert row.total_tokens == 33
        assert row.cost == Decimal("0.5")
        assert row.request_id == "req-xyz"
        assert row.created_at is not None


# ── Version comparison (Task 4) ──────────────────────────────────────────────
class TestVersionCompare:
    def test_current_vs_previous_highlights_changes(self):
        draft = AIQuestionDraftFactory(stem="Original", difficulty="medium")
        _service(question_dict(stem="Better", difficulty="hard")).regenerate(
            draft_id=draft.id
        )
        draft.refresh_from_db()

        result = compare_draft_versions(draft=draft)
        assert result["current_version"] == 2
        assert result["previous_version"] == 1
        assert result["diff"]["stem"]["changed"] is True
        assert result["diff"]["stem"]["previous"] == "Original"
        assert result["diff"]["stem"]["current"] == "Better"
        assert result["diff"]["difficulty"]["changed"] is True
        # An unchanged field is not flagged (both versions keep correct answer "B").
        assert result["diff"]["correct_answer"]["changed"] is False

    def test_no_history_returns_none(self):
        draft = AIQuestionDraftFactory()
        assert compare_draft_versions(draft=draft) is None

    def test_no_earlier_version_marks_nothing_changed(self):
        # Comparing the original (v1) with no predecessor: previous is None.
        draft = AIQuestionDraftFactory()
        _service(question_dict(stem="v2")).regenerate(draft_id=draft.id)
        result = compare_draft_versions(draft=draft, current_version=1)
        assert result["current_version"] == 1
        assert result["previous_version"] is None
        assert all(field["changed"] is False for field in result["diff"].values())

    def test_unknown_current_version_returns_none(self):
        draft = AIQuestionDraftFactory()
        _service(question_dict(stem="v2")).regenerate(draft_id=draft.id)
        assert compare_draft_versions(draft=draft, current_version=99) is None

    def test_explicit_versions(self):
        draft = AIQuestionDraftFactory(stem="v1")
        _service(question_dict(stem="v2")).regenerate(draft_id=draft.id)
        _service(question_dict(stem="v3")).regenerate(draft_id=draft.id)
        draft.refresh_from_db()

        result = compare_draft_versions(
            draft=draft, current_version=3, previous_version=1
        )
        assert result["current_version"] == 3
        assert result["previous_version"] == 1
        assert result["diff"]["stem"]["previous"] == "v1"
        assert result["diff"]["stem"]["current"] == "v3"


# ── Rollback (Task 3) ────────────────────────────────────────────────────────
class TestRollback:
    def test_rollback_restores_earlier_content_without_new_version(self):
        draft = AIQuestionDraftFactory(stem="Original")
        svc = _service(question_dict(stem="Regenerated"))
        svc.regenerate(draft_id=draft.id)
        draft.refresh_from_db()
        assert draft.stem == "Regenerated"

        restored = DraftRegenerationService().rollback(draft_id=draft.id, version=1)
        assert restored.stem == "Original"
        assert restored.current_version == 1
        # History is untouched (append-only) — no version added by rollback.
        assert [h.version for h in list_draft_regenerations(draft_id=draft.id)] == [1, 2]

    def test_rollback_unknown_version_raises(self):
        draft = AIQuestionDraftFactory()
        _service(question_dict(stem="v2")).regenerate(draft_id=draft.id)
        with pytest.raises(RegenerationVersionNotFoundError):
            DraftRegenerationService().rollback(draft_id=draft.id, version=99)

    def test_rollback_requires_generated_status(self):
        draft = AIQuestionDraftFactory(status=DraftStatus.IMPORTED)
        with pytest.raises(DraftNotRegenerableError):
            DraftRegenerationService().rollback(draft_id=draft.id, version=1)


class TestSelectorsAndRepr:
    def test_get_draft_regeneration_by_version(self):
        from ai.selectors import get_draft_regeneration

        draft = AIQuestionDraftFactory()
        _service(question_dict(stem="v2")).regenerate(draft_id=draft.id)
        row = get_draft_regeneration(draft_id=draft.id, version=2)
        assert row is not None and row.version == 2
        assert get_draft_regeneration(draft_id=draft.id, version=5) is None

    def test_regeneration_str(self):
        draft = AIQuestionDraftFactory()
        outcome = _service(question_dict(stem="v2")).regenerate(draft_id=draft.id)
        assert "v2" in str(outcome.regeneration)  # "AIDraftRegeneration(... v2)"


# ── Credit protocol (Task 6) — real gateway, stubbed provider ────────────────
class TestCreditRollback:
    def test_provider_failure_releases_credits(self, settings, monkeypatch):
        from ai.providers.base import ProviderResponse  # noqa: F401 (import parity)
        from ai.exceptions import ProviderResponseError
        from ai.generation.exceptions import ProviderUnavailableError
        from credits.models import CreditLedger
        from credits.selectors import get_credit_balance
        from credits.services import grant_credits

        settings.AI_PROVIDER_CHAIN = ["p1"]
        settings.AI_DEFAULT_MODELS = {"p1": "m1"}
        settings.AI_MODELS = {}
        settings.AI_MAX_RETRIES = 0
        settings.AI_TOKEN_PRICING = {}
        settings.AI_CREDIT_COSTS = {"question_generation": "2"}
        monkeypatch.setattr("ai.services.gateway.time.sleep", lambda *_: None)

        class _FailingProvider:
            def complete(self, **kwargs):
                raise ProviderResponseError("400", retryable=False)

        monkeypatch.setattr(
            "ai.services.gateway.build_provider",
            lambda name, *, http_client=None: _FailingProvider(),
        )

        user = UserFactory()
        grant_credits(user=user, amount=Decimal("10"))
        draft = AIQuestionDraftFactory(created_by=user)

        # Real QuestionGenerationService → real gateway → failing provider.
        svc = DraftRegenerationService()
        with pytest.raises(ProviderUnavailableError):
            svc.regenerate(draft_id=draft.id, created_by=user)

        bal = get_credit_balance(user=user)
        assert bal.available_credits == Decimal("10.00")  # fully released
        assert bal.reserved_credits == Decimal("0.00")
        assert CreditLedger.objects.filter(user=user, transaction_type="release").exists()
        draft.refresh_from_db()
        assert draft.regeneration_count == 0

    def test_success_commits_credits(self, settings, monkeypatch):
        from ai.providers.base import ProviderResponse
        from credits.selectors import get_credit_balance
        from credits.services import grant_credits

        settings.AI_PROVIDER_CHAIN = ["p1"]
        settings.AI_DEFAULT_MODELS = {"p1": "m1"}
        settings.AI_MODELS = {}
        settings.AI_MAX_RETRIES = 0
        settings.AI_TOKEN_PRICING = {}
        settings.AI_CREDIT_COSTS = {"question_generation": "2"}

        class _OkProvider:
            def complete(self, **kwargs):
                return ProviderResponse(
                    text=json.dumps({"questions": [question_dict(stem="improved")]}),
                    model="m1",
                    prompt_tokens=3,
                    completion_tokens=4,
                )

        monkeypatch.setattr(
            "ai.services.gateway.build_provider",
            lambda name, *, http_client=None: _OkProvider(),
        )

        user = UserFactory()
        grant_credits(user=user, amount=Decimal("10"))
        draft = AIQuestionDraftFactory(created_by=user)

        DraftRegenerationService().regenerate(draft_id=draft.id, created_by=user)

        bal = get_credit_balance(user=user)
        # 2 credits committed for one regenerated question.
        assert bal.available_credits == Decimal("8.00")
        assert bal.reserved_credits == Decimal("0.00")
        draft.refresh_from_db()
        assert draft.stem == "improved"
        assert draft.regeneration_count == 1
