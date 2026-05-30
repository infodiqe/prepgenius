from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken


def login_user(*, email: str, password: str) -> tuple[str, str]:
    user = authenticate(request=None, username=email, password=password)

    if user is None:
        raise AuthenticationFailed("Invalid credentials")

    if user.status == "deleted":
        raise AuthenticationFailed("Account not found")

    if user.status == "suspended":
        raise AuthenticationFailed("Account suspended")

    if not user.is_email_verified or user.status == "pending":
        raise AuthenticationFailed(
            "Email not verified. Check your inbox or request a new verification email."
        )

    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])

    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    return str(access), str(refresh)
