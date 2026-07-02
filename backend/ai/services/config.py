"""
Gateway configuration resolution (Sprint-6A-01).

All environment/settings-driven knobs the gateway needs are resolved here so
the orchestration logic stays clean and nothing is hardcoded (PRD §7: model,
provider order, and keys are configuration, not code). Every value is read from
Django settings, which are populated from environment variables.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings

from ai.enums import Provider, PromptType
from ai.exceptions import ProviderConfigurationError

# Maps a provider to the settings attribute holding its API key.
_API_KEY_SETTING: dict[str, str] = {
    Provider.GROQ.value: "GROQ_API_KEY",
    Provider.OPENAI.value: "OPENAI_API_KEY",
    Provider.ANTHROPIC.value: "ANTHROPIC_API_KEY",
    Provider.GEMINI.value: "GEMINI_API_KEY",
    Provider.DEEPSEEK.value: "DEEPSEEK_API_KEY",
    Provider.MOCK.value: "",  # no key
}

_COST_QUANTUM = Decimal("0.000001")


@dataclass(frozen=True)
class RetryConfig:
    max_retries: int
    backoff_seconds: float
    timeout_seconds: float


def provider_chain() -> list[str]:
    """The ordered fallback chain of provider names (PRD §7: Groq → OpenAI → …)."""
    return list(settings.AI_PROVIDER_CHAIN)


def provider_api_key(provider: str) -> str:
    """Resolve a provider's API key from settings ('' when none/not required)."""
    setting_name = _API_KEY_SETTING.get(provider)
    if not setting_name:
        return ""
    return getattr(settings, setting_name, "") or ""


def provider_base_url(provider: str) -> str | None:
    """Optional per-provider base-URL override (``AI_PROVIDER_BASE_URLS``)."""
    overrides = getattr(settings, "AI_PROVIDER_BASE_URLS", {}) or {}
    return overrides.get(provider)


def resolve_model(
    prompt_type: PromptType | str,
    provider: str,
    override: str | None = None,
) -> str:
    """
    Resolve the model for a (prompt_type, provider) pair. Precedence:

    1. explicit ``override`` (caller-supplied);
    2. per-operation mapping ``AI_MODELS[prompt_type][provider]``;
    3. per-provider default ``AI_DEFAULT_MODELS[provider]``.

    Raises :class:`ProviderConfigurationError` if nothing resolves.
    """
    if override:
        return override
    key = str(PromptType(prompt_type).value) if _is_prompt_type(prompt_type) else str(prompt_type)
    per_op = (settings.AI_MODELS or {}).get(key, {})
    if provider in per_op:
        return per_op[provider]
    defaults = getattr(settings, "AI_DEFAULT_MODELS", {}) or {}
    if provider in defaults:
        return defaults[provider]
    raise ProviderConfigurationError(
        f"No model configured for provider '{provider}' and prompt '{key}'."
    )


def _is_prompt_type(value: PromptType | str) -> bool:
    try:
        PromptType(value)
    except ValueError:
        return False
    return True


def retry_config() -> RetryConfig:
    """Retry/timeout policy from settings (all env-overridable)."""
    return RetryConfig(
        max_retries=int(getattr(settings, "AI_MAX_RETRIES", 2)),
        backoff_seconds=float(getattr(settings, "AI_RETRY_BACKOFF_SECONDS", 0.5)),
        timeout_seconds=float(getattr(settings, "AI_REQUEST_TIMEOUT_SECONDS", 30.0)),
    )


def compute_cost(
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> Decimal:
    """
    Cost in currency units from ``AI_TOKEN_PRICING[provider][model]`` (per-1K-token
    ``prompt``/``completion`` rates). Returns ``0`` when no pricing is configured —
    cost tracking is best-effort and never blocks a call.
    """
    pricing = getattr(settings, "AI_TOKEN_PRICING", {}) or {}
    rates = (pricing.get(provider, {}) or {}).get(model)
    if not rates:
        return Decimal("0")
    prompt_rate = Decimal(str(rates.get("prompt", 0)))
    completion_rate = Decimal(str(rates.get("completion", 0)))
    cost = (
        Decimal(prompt_tokens) / Decimal(1000) * prompt_rate
        + Decimal(completion_tokens) / Decimal(1000) * completion_rate
    )
    return cost.quantize(_COST_QUANTUM, rounding=ROUND_HALF_UP)
