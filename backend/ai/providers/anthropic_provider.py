"""
Anthropic Claude adapter (Sprint-6A-01).

Anthropic's Messages API differs from OpenAI's: a top-level ``system`` string,
an ``x-api-key`` header, a required ``max_tokens``, and ``usage.input_tokens`` /
``usage.output_tokens``. All of that provider-specific shape stays here.
"""
from __future__ import annotations

from typing import Any

from ai.enums import Provider
from ai.exceptions import ProviderResponseError
from ai.providers.base import BaseProvider, ProviderResponse

_ANTHROPIC_VERSION = "2023-06-01"
_DEFAULT_MAX_TOKENS = 1024


class AnthropicProvider(BaseProvider):
    name = Provider.ANTHROPIC.value
    default_base_url = "https://api.anthropic.com/v1"

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
        url = f"{self.base_url}/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": _ANTHROPIC_VERSION,
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": model,
            "max_tokens": params.pop("max_tokens", _DEFAULT_MAX_TOKENS),
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
        payload.update(params)
        data = self._post_json(url, headers=headers, payload=payload, timeout=timeout)
        return self._parse(data, model)

    def _parse(self, data: dict[str, Any], model: str) -> ProviderResponse:
        try:
            blocks = data["content"]
            text = "".join(
                block.get("text", "")
                for block in blocks
                if block.get("type", "text") == "text"
            )
        except (KeyError, TypeError, AttributeError) as exc:
            raise ProviderResponseError(
                "anthropic response missing content blocks",
                provider=self.name,
            ) from exc
        usage = data.get("usage") or {}
        return ProviderResponse(
            text=text,
            model=data.get("model", model),
            prompt_tokens=int(usage.get("input_tokens", 0) or 0),
            completion_tokens=int(usage.get("output_tokens", 0) or 0),
            raw=data,
        )
