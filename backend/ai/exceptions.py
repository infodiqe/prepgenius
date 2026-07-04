"""
AI Gateway domain exceptions (Sprint-6A-01).

One base (:class:`AiDomainError`) with two families:

* **Provider failures** (:class:`ProviderError` + subclasses) — a single provider
  call went wrong. Each carries a ``retryable`` flag so the gateway's retry /
  fallback loop knows whether to retry the same provider, move to the next one,
  or give up. These are handled gracefully by the gateway and never crash the
  caller (they surface as a failed ``AIResult``).
* **Contract errors** (:class:`PromptNotRegisteredError`,
  :class:`PromptRenderError`, :class:`ProviderConfigurationError`) — the caller
  or the deployment is misconfigured. These are programming/ops errors and are
  raised eagerly so they are fixed rather than silently swallowed.
"""
from __future__ import annotations


class AiDomainError(Exception):
    """Base exception class for the AI domain."""


class ProviderConfigurationError(AiDomainError):
    """Provider is unknown, has no API key, or has no resolvable model."""


class PromptNotRegisteredError(AiDomainError):
    """Requested prompt type has no entry in the prompt registry."""


class PromptRenderError(AiDomainError):
    """A prompt template could not be rendered from the supplied payload."""


class ProviderError(AiDomainError):
    """
    Base class for a failed provider call.

    ``retryable`` tells the gateway whether retrying the *same* provider could
    help (transient conditions: timeout, rate limit, 5xx). Non-retryable errors
    (bad request, auth) cause the gateway to move straight to the next provider
    in the fallback chain.
    """

    retryable: bool = False

    def __init__(
        self,
        message: str = "",
        *,
        provider: str | None = None,
        status_code: int | None = None,
        retryable: bool | None = None,
    ) -> None:
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code
        if retryable is not None:
            self.retryable = retryable


class ProviderTimeoutError(ProviderError):
    """The provider did not respond within the configured timeout."""

    retryable = True


class ProviderRateLimitError(ProviderError):
    """The provider rejected the call with a rate-limit (HTTP 429)."""

    retryable = True


class ProviderAuthError(ProviderError):
    """The provider rejected the credentials (HTTP 401/403). Not retryable."""

    retryable = False


class ProviderResponseError(ProviderError):
    """
    The provider returned an error status or an unparseable body. 5xx is
    retryable (transient upstream fault); 4xx is not (the request is malformed).
    """


class AllProvidersFailed(AiDomainError):  # noqa: N818
    """Every provider in the fallback chain failed."""


class InsufficientCreditsError(AiDomainError):  # noqa: N818
    """
    The caller lacks the credits to run an AI operation (Sprint-6B-01, Task 2).

    Raised *before* any provider call — the reserve failed, so per PRD §7 ("no
    call without a successful reserve") the gateway never contacts a provider.
    This is a precondition failure (like a contract error), so it is raised rather
    than returned as a failed ``AIResult``.
    """
