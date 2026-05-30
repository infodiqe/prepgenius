"""
Utility functions for setting and clearing JWT httpOnly cookies on
API responses.
PRD v4 §5 (auth), SAD §5 (Authentication Architecture).
"""
from django.conf import settings


def set_auth_cookies(response, access_token, refresh_token):
    """
    Sets JWT tokens as httpOnly, Secure, SameSite=Lax cookies on the response.
    Mutates *response* in place; returns nothing.
    """
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie(
        key=settings.SIMPLE_JWT["AUTH_COOKIE"],
        value=access_token,
        max_age=access_max_age,
        secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
        httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
        samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
        path="/",
    )
    response.set_cookie(
        key=settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"],
        value=refresh_token,
        max_age=refresh_max_age,
        secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
        httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
        samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
        path="/",
    )


def clear_auth_cookies(response):
    """
    Deletes JWT cookies on logout.
    Mutates *response* in place; returns nothing.
    """
    response.delete_cookie(
        key=settings.SIMPLE_JWT["AUTH_COOKIE"],
        path="/",
    )
    response.delete_cookie(
        key=settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"],
        path="/",
    )
