"""
OpenAI-compatible providers (Sprint-6A-01).

OpenAI, Groq, and DeepSeek all expose the same ``/chat/completions`` contract
(messages in, ``choices[].message.content`` + ``usage`` out), so they share one
adapter implementation and differ only by base URL and :class:`Provider` name.
This keeps provider-specific surface minimal while still isolating each behind
its own adapter class.
"""
from __future__ import annotations

from typing import Any

from ai.enums import Provider
from ai.exceptions import ProviderResponseError
from ai.providers.base import BaseProvider, ProviderResponse


class OpenAICompatibleProvider(BaseProvider):
    """Shared implementation for OpenAI-style ``/chat/completions`` APIs."""

    def complete(
        self,
        *,
        model: str,
        system: str,
        user: str,
        timeout: float,
        **params: Any,
    ) -> ProviderResponse:
        self._ensure_configured()
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        payload.update(params)
        data = self._post_json(url, headers=headers, payload=payload, timeout=timeout)
        return self._parse(data, model)

    def _parse(self, data: dict[str, Any], model: str) -> ProviderResponse:
        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderResponseError(
                f"{self.name} response missing choices/message content",
                provider=self.name,
            ) from exc
        usage = data.get("usage") or {}
        return ProviderResponse(
            text=text or "",
            model=data.get("model", model),
            prompt_tokens=int(usage.get("prompt_tokens", 0) or 0),
            completion_tokens=int(usage.get("completion_tokens", 0) or 0),
            raw=data,
        )


class OpenAIProvider(OpenAICompatibleProvider):
    name = Provider.OPENAI.value
    default_base_url = "https://api.openai.com/v1"


class GroqProvider(OpenAICompatibleProvider):
    name = Provider.GROQ.value
    default_base_url = "https://api.groq.com/openai/v1"


class DeepSeekProvider(OpenAICompatibleProvider):
    name = Provider.DEEPSEEK.value
    default_base_url = "https://api.deepseek.com/v1"
