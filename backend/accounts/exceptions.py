from rest_framework import status
from rest_framework.exceptions import APIException


class AccountLockedError(APIException):
    """Raised when an account is temporarily locked after too many failed logins.

    Distinct from AuthenticationFailed so the API can return 423 Locked while
    plain bad credentials stay 401. The detail is intentionally generic and never
    confirms whether the email is registered (PH-4 / §6).
    """

    status_code = status.HTTP_423_LOCKED
    default_detail = (
        "Account temporarily locked due to too many failed login attempts. "
        "Please try again later."
    )
    default_code = "account_locked"
