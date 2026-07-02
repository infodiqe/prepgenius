"""
Provider registry (Sprint-6A-01).

Maps each :class:`ai.enums.Provider` to exactly one adapter class and builds a
configured instance (API key resolved from settings via ``ai.services.config``).
The gateway builds providers only through :func:`build_provider`, so provider
selection stays data-driven and no provider-specific code leaks into services.
"""
from __future__ import annotations

import httpx

from ai.enums import Provider
from ai.exceptions import ProviderConfigurationError
from ai.providers.anthropic_provider import AnthropicProvider
from ai.providers.base import BaseProvider, ProviderResponse
from ai.providers.gemini_provider import GeminiProvider
from ai.providers.mock_provider import MockProvider
from ai.providers.openai_compatible import (
    DeepSeekProvider,
    GroqProvider,
    OpenAICompatibleProvider,
    OpenAIProvider,
)

PROVIDER_CLASSES: dict[str, type[BaseProvider]] = {
    Provider.GROQ.value: GroqProvider,
    Provider.OPENAI.value: OpenAIProvider,
    Provider.ANTHROPIC.value: AnthropicProvider,
    Provider.GEMINI.value: GeminiProvider,
    Provider.DEEPSEEK.value: DeepSeekProvider,
    Provider.MOCK.value: MockProvider,
}


def get_provider_class(name: str) -> type[BaseProvider]:
    """Return the adapter class for a provider name or raise."""
    try:
        return PROVIDER_CLASSES[name]
    except KeyError as exc:
        raise ProviderConfigurationError(f"Unknown AI provider: {name!r}") from exc


def build_provider(
    name: str,
    *,
    http_client: httpx.Client | None = None,
) -> BaseProvider:
    """
    Instantiate the adapter for ``name`` with its configured API key.

    Imported lazily to avoid a settings import at module load. Raises
    :class:`ProviderConfigurationError` for unknown providers (missing keys are
    validated lazily at call time by each adapter).
    """
    from ai.services import config

    provider_class = get_provider_class(name)
    api_key = config.provider_api_key(name)
    base_url = config.provider_base_url(name)
    return provider_class(api_key=api_key, base_url=base_url, http_client=http_client)


__all__ = [
    "PROVIDER_CLASSES",
    "AnthropicProvider",
    "BaseProvider",
    "DeepSeekProvider",
    "GeminiProvider",
    "GroqProvider",
    "MockProvider",
    "OpenAICompatibleProvider",
    "OpenAIProvider",
    "ProviderResponse",
    "build_provider",
    "get_provider_class",
]
