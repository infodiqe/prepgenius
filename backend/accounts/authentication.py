"""
Custom JWT authentication backend that reads tokens from httpOnly cookies
instead of the Authorization header.
PRD v4 §5 (auth), SAD §5 (Authentication Architecture).
"""
from django.conf import settings
from rest_framework.authentication import get_authorization_header
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the access JWT from an httpOnly cookie (settings.SIMPLE_JWT["AUTH_COOKIE"]).
    Falls back to the Authorization header for schema/explorer tools.
    This is the ONLY authentication class used in production.
    """

    def authenticate(self, request):
        """
        1. Try the httpOnly cookie first.
        2. If no cookie, fall back to the Authorization header (for Browsable API / tools).
        3. If neither, return None (anonymous).
        """
        raw_token = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE"])

        if raw_token is None:
            # Fallback: check the Authorization header (for drf-spectacular, tools)
            raw_token = get_authorization_header(request).split()
            if not raw_token:
                return None
            return super().authenticate(request)

        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError):
            raise AuthenticationFailed("Token is invalid or expired.")

        return (self.get_user(validated_token), validated_token)
