class AiDomainError(Exception):
    """Base exception class for the AI domain."""
    pass


class ProviderError(AiDomainError):
    """Raised when an AI provider call fails."""
    pass


class AllProvidersFailed(AiDomainError):  # noqa: N818
    """Raised when all configured AI providers in the fallback chain fail."""
    pass
