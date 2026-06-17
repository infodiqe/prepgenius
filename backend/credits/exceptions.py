class CreditDomainError(Exception):
    """Base exception class for the credits domain."""
    pass


class InsufficientCredits(CreditDomainError):  # noqa: N818
    """Raised when a credit operation is requested but the available balance is insufficient."""
    pass
