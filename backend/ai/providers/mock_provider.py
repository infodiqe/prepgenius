"""
Mock provider (Sprint-6A-01).

A network-free provider used in tests and local/dev configurations (the existing
``AI_MODELS`` config already references a ``mock`` provider). It returns a
deterministic echo-style completion and synthetic token counts so the gateway,
audit logging, and cost paths can be exercised end-to-end without any external
call. It performs no I/O and needs no API key.
"""
from __future__ import annotations

from typing import Any

from ai.enums import Provider
from ai.providers.base import BaseProvider, ProviderResponse


class MockProvider(BaseProvider):
    name = Provider.MOCK.value
    requires_api_key = False

    def complete(
        self,
        *,
        model: str,
        system: str,
        user: str,
        timeout: float,
        **params: Any,
    ) -> ProviderResponse:
        text = f"[mock:{model}] {user}"
        # Deterministic, whitespace-based synthetic token counts.
        prompt_tokens = len(system.split()) + len(user.split())
        completion_tokens = len(text.split())
        return ProviderResponse(
            text=text,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            raw={"mock": True, "params": params},
        )
