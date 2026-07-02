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
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

import httpx

from ai.enums import PromptType, RequestStatus
from ai.exceptions import (
    AllProvidersFailed,
    ProviderConfigurationError,
    ProviderError,
)
from ai.prompts import render_prompt
from ai.providers import build_provider
from ai.services import config

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
    :param created_by: the user to attribute the audit row to (may be ``None``).
    :param raise_on_failure: raise :class:`AllProvidersFailed` instead of
        returning a failed :class:`AIResult` (default: return, never crash).
    :param provider_params: extra provider kwargs (e.g. ``temperature``).
    """
    prompt_type_value = str(prompt_type.value if isinstance(prompt_type, PromptType) else prompt_type)

    # Contract validation (raises PromptNotRegisteredError / PromptRenderError).
    rendered = render_prompt(prompt_type, payload)

    chain = [provider] if provider else config.provider_chain()
    retry = config.retry_config()

    start = time.monotonic()
    attempts = 0
    last_error = ""
    last_provider: str | None = None
    last_model: str | None = None

    for provider_name in chain:
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
                is_last_attempt = attempt >= retry.max_retries
                if exc.retryable and not is_last_attempt:
                    logger.info(
                        "ai.gateway.retry",
                        extra={"provider": provider_name, "attempt": attempt + 1, "error": str(exc)},
                    )
                    if retry.backoff_seconds > 0:
                        time.sleep(retry.backoff_seconds * (attempt + 1))
                    continue
                # Not retryable, or retries exhausted → next provider.
                logger.warning(
                    "ai.gateway.provider_failed",
                    extra={"provider": provider_name, "error": str(exc), "retryable": exc.retryable},
                )
                break
            else:
                latency_ms = int((time.monotonic() - start) * 1000)
                cost = config.compute_cost(
                    provider_name,
                    resolved_model,
                    response.prompt_tokens,
                    response.completion_tokens,
                )
                request_id = _log_request(
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

    # Every provider failed.
    latency_ms = int((time.monotonic() - start) * 1000)
    request_id = _log_request(
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


def _log_request(
    *,
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
    Persist one :class:`ai.models.AIRequest` audit row. Audit logging must never
    crash the caller — a DB failure here is logged and swallowed (the AI result
    still returns), returning ``None`` for the request id.
    """
    from ai.models import AIRequest

    try:
        record = AIRequest.objects.create(
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
