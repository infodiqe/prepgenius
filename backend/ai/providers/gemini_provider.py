"""
Google Gemini adapter (Sprint-6A-01).

Gemini's ``generateContent`` API puts the model in the URL path, the key in a
query parameter, the system prompt under ``systemInstruction``, and token counts
under ``usageMetadata``. That provider-specific shape is confined to this adapter.
"""
from __future__ import annotations

from typing import Any

from ai.enums import Provider
from ai.exceptions import ProviderResponseError
from ai.providers.base import BaseProvider, ProviderResponse


class GeminiProvider(BaseProvider):
    name = Provider.GEMINI.value
    default_base_url = "https://generativelanguage.googleapis.com/v1beta"

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
        url = f"{self.base_url}/models/{model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload: dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "systemInstruction": {"parts": [{"text": system}]},
        }
        payload.update(params)
        data = self._post_json(url, headers=headers, payload=payload, timeout=timeout)
        return self._parse(data, model)

    def _parse(self, data: dict[str, Any], model: str) -> ProviderResponse:
        try:
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(part.get("text", "") for part in parts)
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderResponseError(
                "gemini response missing candidates/parts",
                provider=self.name,
            ) from exc
        usage = data.get("usageMetadata") or {}
        return ProviderResponse(
            text=text,
            model=data.get("modelVersion", model),
            prompt_tokens=int(usage.get("promptTokenCount", 0) or 0),
            completion_tokens=int(usage.get("candidatesTokenCount", 0) or 0),
            raw=data,
        )
