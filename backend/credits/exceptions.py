class CreditDomainError(Exception):
    """Base exception class for the credits domain."""
    pass


class InsufficientCredits(CreditDomainError):  # noqa: N818
    """Raised when a credit operation is requested but the available balance is insufficient."""
    pass


class InsufficientReservedCredits(CreditDomainError):  # noqa: N818
    """Raised when committing/releasing more than is currently reserved."""
    pass


class InvalidCreditAmount(CreditDomainError):  # noqa: N818
    """Raised when an amount is invalid for the operation (e.g. non-positive)."""
    pass


class LedgerAppendOnlyError(CreditDomainError):
    """Raised on any attempt to update or delete a ledger entry."""
    pass
