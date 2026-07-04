"""
AI Gateway service — the single entry point for every AI call (Sprint-6A-01).

``generate()`` is the one function every future AI feature (question generation,
tutor, translation, analytics) calls. It:

1. renders the prompt from the enum-based registry (never inline strings);
2. walks the configured provider fallback chain (Groq → OpenAI → … per PRD §7);
3. retries transient failures per the configurable retry policy, with timeout
   handling, and moves to the next provider on non-retryable / exhausted errors;
4. writes exactly one :class:`ai.models.AIRequest` audit row per call (provider,
   model, latency, tokens, cost, status); and
5. returns an :class:`AIResult` — provider failures are graceful and NEVER crash
   the caller (PRD §7). Contract errors (unknown prompt, missing input, bad
   config) DO raise, since those are bugs to fix, not runtime conditions.

This sprint builds infrastructure only: no credit reserve/commit, no caching, no
question generation — those layer on top of this entry point in later sprints.
"""
from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

import httpx

from ai.enums import PromptType, RequestStatus
from ai.exceptions import (
    AllProvidersFailed,
    InsufficientCreditsError,
    ProviderConfigurationError,
    ProviderError,
    ProviderTimeoutError,
)
from ai.prompts import render_prompt
from ai.providers import build_provider
from ai.services import circuit, config

logger = logging.getLogger("ai.gateway")


@dataclass
class AIResult:
    """Outcome of a :func:`generate` call. ``success`` gates ``text``."""

    success: bool
    prompt_type: str
    provider: str | None = None
    model: str | None = None
    text: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost: Decimal = field(default_factory=lambda: Decimal("0"))
    latency_ms: int = 0
    attempts: int = 0
    request_id: str | None = None
    error: str = ""


def generate(
    *,
    prompt_type: PromptType | str,
    payload: dict[str, Any],
    provider: str | None = None,
    model: str | None = None,
    created_by: Any | None = None,
    credit_units: int = 1,
    raise_on_failure: bool = False,
    http_client: httpx.Client | None = None,
    **provider_params: Any,
) -> AIResult:
    """
    Run an AI completion for ``prompt_type`` with ``payload``.

    :param prompt_type: an :class:`ai.enums.PromptType` (or its value).
    :param payload: input variables for the prompt template.
    :param provider: force a single provider instead of the fallback chain.
    :param model: force a specific model instead of resolving from config.
    :param created_by: the user to attribute the audit row to and to charge
        credits against (may be ``None`` → a system call, never charged).
    :param credit_units: unit multiplier for the per-operation credit cost
        (e.g. the number of questions being generated). Cost per unit comes from
        ``AI_CREDIT_COSTS[prompt_type]``; a zero cost skips credit enforcement.
    :param raise_on_failure: raise :class:`AllProvidersFailed` instead of
        returning a failed :class:`AIResult` (default: return, never crash).
    :param provider_params: extra provider kwargs (e.g. ``temperature``).
    :raises InsufficientCreditsError: the reserve failed — no provider is called.
    """
    prompt_type_value = str(prompt_type.value if isinstance(prompt_type, PromptType) else prompt_type)

    # Contract validation (raises PromptNotRegisteredError / PromptRenderError).
    rendered = render_prompt(prompt_type, payload)

    # Correlates the audit row and the credit-ledger entries for this call.
    request_uuid = uuid.uuid4()

    # ── Credit protocol (PRD §7): reserve BEFORE any provider call ────────────
    cost_credits = config.credit_cost(prompt_type, credit_units)
    charge = created_by is not None and cost_credits > Decimal("0")
    if charge:
        _reserve_credits(
            user=created_by,
            amount=cost_credits,
            reference_id=request_uuid,
            prompt_type=prompt_type_value,
        )

    chain = [provider] if provider else config.provider_chain()
    retry = config.retry_config()

    start = time.monotonic()
    attempts = 0
    last_error = ""
    last_provider: str | None = None
    last_model: str | None = None

    for provider_name in chain:
        # ── Circuit breaker (Task 5): skip a provider that is tripped open ────
        if not circuit.allow_request(provider_name):
            last_error = f"circuit open for provider '{provider_name}'"
            last_provider = provider_name
            logger.warning("ai.gateway.circuit_open", extra={"provider": provider_name})
            continue

        try:
            resolved_model = config.resolve_model(prompt_type, provider_name, model)
        except ProviderConfigurationError as exc:
            last_error = str(exc)
            last_provider = provider_name
            logger.warning("ai.gateway.skip_provider", extra={"provider": provider_name, "error": str(exc)})
            continue

        try:
            adapter = build_provider(provider_name, http_client=http_client)
        except ProviderConfigurationError as exc:
            last_error = str(exc)
            last_provider = provider_name
            last_model = resolved_model
            logger.warning("ai.gateway.build_failed", extra={"provider": provider_name, "error": str(exc)})
            continue

        last_provider = provider_name
        last_model = resolved_model
        provider_retries = 0
        timed_out = False

        for attempt in range(retry.max_retries + 1):
            attempts += 1
            try:
                response = adapter.complete(
                    model=resolved_model,
                    system=rendered.system,
                    user=rendered.user,
                    timeout=retry.timeout_seconds,
                    **provider_params,
                )
            except ProviderError as exc:
                last_error = str(exc)
                timed_out = isinstance(exc, ProviderTimeoutError)
                is_last_attempt = attempt >= retry.max_retries
                if exc.retryable and not is_last_attempt:
                    provider_retries += 1
                    logger.info(
                        "ai.gateway.retry",
                        extra={"provider": provider_name, "attempt": attempt + 1, "error": str(exc)},
                    )
                    if retry.backoff_seconds > 0:
                        time.sleep(retry.backoff_seconds * (attempt + 1))
                    continue
                # Not retryable, or retries exhausted → record failure, next provider.
                logger.warning(
                    "ai.gateway.provider_failed",
                    extra={"provider": provider_name, "error": str(exc), "retryable": exc.retryable},
                )
                _record_failure(provider_name, timeout=timed_out, retries=provider_retries)
                break
            else:
                latency_ms = int((time.monotonic() - start) * 1000)
                cost = config.compute_cost(
                    provider_name,
                    resolved_model,
                    response.prompt_tokens,
                    response.completion_tokens,
                )
                _record_success(provider_name, retries=provider_retries)
                request_id = _log_request(
                    record_id=request_uuid,
                    provider=provider_name,
                    model=resolved_model,
                    prompt_type=prompt_type_value,
                    payload=payload,
                    output=response.text,
                    status=RequestStatus.SUCCESS,
                    latency_ms=latency_ms,
                    prompt_tokens=response.prompt_tokens,
                    completion_tokens=response.completion_tokens,
                    cost=cost,
                    attempts=attempts,
                    error="",
                    created_by=created_by,
                )
                if charge:
                    _commit_credits(
                        user=created_by,
                        amount=cost_credits,
                        reference_id=request_uuid,
                        prompt_type=prompt_type_value,
                    )
                logger.info(
                    "ai.gateway.success",
                    extra={
                        "provider": provider_name,
                        "model": resolved_model,
                        "prompt_type": prompt_type_value,
                        "latency_ms": latency_ms,
                        "total_tokens": response.total_tokens,
                    },
                )
                return AIResult(
                    success=True,
                    prompt_type=prompt_type_value,
                    provider=provider_name,
                    model=resolved_model,
                    text=response.text,
                    prompt_tokens=response.prompt_tokens,
                    completion_tokens=response.completion_tokens,
                    total_tokens=response.total_tokens,
                    cost=cost,
                    latency_ms=latency_ms,
                    attempts=attempts,
                    request_id=request_id,
                )

    # Every provider failed → release the reservation (nothing was delivered).
    if charge:
        _release_credits(
            user=created_by,
            amount=cost_credits,
            reference_id=request_uuid,
            prompt_type=prompt_type_value,
        )

    latency_ms = int((time.monotonic() - start) * 1000)
    request_id = _log_request(
        record_id=request_uuid,
        provider=last_provider or "",
        model=last_model or "",
        prompt_type=prompt_type_value,
        payload=payload,
        output="",
        status=RequestStatus.FAILED,
        latency_ms=latency_ms,
        prompt_tokens=0,
        completion_tokens=0,
        cost=Decimal("0"),
        attempts=attempts,
        error=last_error,
        created_by=created_by,
    )
    logger.error(
        "ai.gateway.all_failed",
        extra={"prompt_type": prompt_type_value, "attempts": attempts, "error": last_error},
    )
    if raise_on_failure:
        raise AllProvidersFailed(last_error or "All AI providers failed.")
    return AIResult(
        success=False,
        prompt_type=prompt_type_value,
        provider=last_provider,
        model=last_model,
        latency_ms=latency_ms,
        attempts=attempts,
        request_id=request_id,
        error=last_error or "All AI providers failed.",
    )


# ── Credit protocol helpers (reuse the credits module; never duplicate ledger) ─
def _reserve_credits(*, user, amount: Decimal, reference_id, prompt_type: str) -> None:
    """Reserve credits before the call. Translate insufficiency to a domain error."""
    from credits.exceptions import InsufficientCredits
    from credits.services import reserve_credits

    try:
        reserve_credits(
            user=user,
            amount=amount,
            reference_id=reference_id,
            description=f"AI reserve: {prompt_type}",
        )
    except InsufficientCredits as exc:
        logger.warning(
            "ai.gateway.insufficient_credits",
            extra={"prompt_type": prompt_type, "amount": str(amount)},
        )
        raise InsufficientCreditsError(str(exc)) from exc


def _commit_credits(*, user, amount: Decimal, reference_id, prompt_type: str) -> None:
    from credits.services import commit_reserved_credits

    commit_reserved_credits(
        user=user,
        amount=amount,
        reference_id=reference_id,
        description=f"AI commit: {prompt_type}",
    )


def _release_credits(*, user, amount: Decimal, reference_id, prompt_type: str) -> None:
    from credits.services import release_reserved_credits

    release_reserved_credits(
        user=user,
        amount=amount,
        reference_id=reference_id,
        description=f"AI release: {prompt_type}",
    )


# ── Provider-health recording (best-effort; must never break the call) ─────────
def _record_success(provider: str, *, retries: int) -> None:
    from ai.services import metrics

    try:
        metrics.record_success(provider, retries=retries)
    except Exception:  # noqa: BLE001 - monitoring must not break the caller
        logger.exception("ai.gateway.health_write_failed", extra={"provider": provider})


def _record_failure(provider: str, *, timeout: bool, retries: int) -> None:
    from ai.services import metrics

    try:
        metrics.record_failure(provider, timeout=timeout, retries=retries)
    except Exception:  # noqa: BLE001 - monitoring must not break the caller
        logger.exception("ai.gateway.health_write_failed", extra={"provider": provider})


def _log_request(
    *,
    record_id: uuid.UUID,
    provider: str,
    model: str,
    prompt_type: str,
    payload: dict[str, Any],
    output: str,
    status: str,
    latency_ms: int,
    prompt_tokens: int,
    completion_tokens: int,
    cost: Decimal,
    attempts: int,
    error: str,
    created_by: Any | None,
) -> str | None:
    """
    Persist one :class:`ai.models.AIRequest` audit row under the pre-generated
    ``record_id`` (so it correlates with this call's credit-ledger entries). Audit
    logging must never crash the caller — a DB failure here is logged and swallowed
    (the AI result still returns), returning ``None`` for the request id.
    """
    from ai.models import AIRequest

    try:
        record = AIRequest.objects.create(
            id=record_id,
            provider=provider,
            model=model,
            prompt_type=prompt_type,
            input=payload,
            output=output,
            status=status,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost=cost,
            attempts=attempts,
            error=error,
            created_by=created_by,
        )
    except Exception:  # noqa: BLE001 - audit must not break the caller
        logger.exception("ai.gateway.audit_write_failed", extra={"prompt_type": prompt_type})
        return None
    return str(record.id)
