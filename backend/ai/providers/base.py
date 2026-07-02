"""
Provider abstraction (Sprint-6A-01).

:class:`BaseProvider` is the single contract every AI provider adapter
implements. The gateway only ever talks to this interface — it knows nothing
about any provider's URL, auth scheme, or payload shape. All provider-specific
code is confined to the concrete adapters in this package (PRD §7:
"No provider-specific code outside adapters").

Transport is plain ``httpx`` (already a dependency) rather than five separate
vendor SDKs: it keeps the adapters uniform, dependency-light, and trivially
mockable in tests (inject a fake client via ``http_client``). Each adapter maps
its provider's HTTP faults onto the shared :class:`ai.exceptions.ProviderError`
family so the gateway's retry/fallback logic is provider-agnostic.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import httpx

from ai.exceptions import (
    ProviderAuthError,
    ProviderConfigurationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
)


@dataclass
class ProviderResponse:
    """Normalized result of a provider completion call."""

    text: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


class BaseProvider(ABC):
    """
    Base adapter. Subclasses set :attr:`name` / :attr:`default_base_url` and
    implement :meth:`complete`. They should call :meth:`_post_json` for transport
    so HTTP-fault mapping stays consistent across providers.
    """

    #: :class:`ai.enums.Provider` value this adapter serves.
    name: str = ""
    #: Default REST base URL; overridable via constructor / settings.
    default_base_url: str = ""
    #: Whether an API key is required to use this provider.
    requires_api_key: bool = True

    def __init__(
        self,
        *,
        api_key: str = "",
        base_url: str | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = (base_url or self.default_base_url).rstrip("/")
        self._http_client = http_client

    # ── Contract ─────────────────────────────────────────────────────────────
    @abstractmethod
    def complete(
        self,
        *,
        model: str,
        system: str,
        user: str,
        timeout: float,
        **params: Any,
    ) -> ProviderResponse:
        """Run a single completion. Raise a :class:`ProviderError` on failure."""
        raise NotImplementedError  # pragma: no cover - abstract

    # ── Shared helpers ───────────────────────────────────────────────────────
    def _ensure_configured(self) -> None:
        if self.requires_api_key and not self.api_key:
            raise ProviderConfigurationError(
                f"Provider '{self.name}' has no API key configured."
            )

    def _post_json(
        self,
        url: str,
        *,
        headers: dict[str, str],
        payload: dict[str, Any],
        timeout: float,
    ) -> dict[str, Any]:
        """
        POST ``payload`` as JSON and return the decoded body, mapping transport
        and HTTP-status faults onto the :class:`ProviderError` family.
        """
        client = self._http_client or httpx.Client(timeout=timeout)
        must_close = self._http_client is None
        try:
            response = client.post(url, headers=headers, json=payload, timeout=timeout)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"{self.name} timed out after {timeout}s", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:  # connection/transport error → transient
            raise ProviderError(
                f"{self.name} transport error: {exc}",
                provider=self.name,
                retryable=True,
            ) from exc
        finally:
            if must_close:
                client.close()

        self._raise_for_status(response)
        try:
            return response.json()
        except ValueError as exc:
            raise ProviderResponseError(
                f"{self.name} returned a non-JSON body",
                provider=self.name,
                status_code=response.status_code,
            ) from exc

    def _raise_for_status(self, response: httpx.Response) -> None:
        code = response.status_code
        if code < 400:
            return
        body = response.text[:500]
        if code in (401, 403):
            raise ProviderAuthError(
                f"{self.name} auth failed ({code}): {body}",
                provider=self.name,
                status_code=code,
            )
        if code == 429:
            raise ProviderRateLimitError(
                f"{self.name} rate limited ({code}): {body}",
                provider=self.name,
                status_code=code,
            )
        # 5xx is transient (retryable); other 4xx is a bad request (not).
        raise ProviderResponseError(
            f"{self.name} error ({code}): {body}",
            provider=self.name,
            status_code=code,
            retryable=code >= 500,
        )
