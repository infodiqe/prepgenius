import logging

from django.conf import settings
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.api.serializers import (
    DeleteAccountSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistrationSerializer,
    ResendVerificationSerializer,
    UpdateProfileSerializer,
    UserProfileSerializer,
    VerifyEmailSerializer,
)
from accounts.cookie_utils import clear_auth_cookies, set_auth_cookies
from accounts.selectors.user_selectors import get_user_profile
from accounts.services.auth_service import login_user
from accounts.services.dpdp_service import delete_account, request_data_export
from accounts.services.password_service import confirm_password_reset, request_password_reset
from accounts.services.profile_service import update_user_profile
from accounts.services.registration import create_user
from accounts.services.verification import resend_verification, verify_email
from accounts.throttles import LoginRateThrottle

logger = logging.getLogger(__name__)


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_register",
        summary="Register a new user account",
        request=RegistrationSerializer,
        responses={
            201: OpenApiResponse(description="Registration successful. Verification email sent."),
            400: OpenApiResponse(description="Validation error"),
        },
        tags=["auth"],
    ),
)
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip_address = request.META.get("REMOTE_ADDR")

        try:
            create_user(**serializer.validated_data, ip_address=ip_address)
        except ValidationError as exc:
            return Response(
                {"detail": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Registration successful. Check your email to verify your account."},
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_verify_email",
        summary="Verify email address with token",
        request=VerifyEmailSerializer,
        responses={
            200: OpenApiResponse(description="Email verified successfully."),
            400: OpenApiResponse(description="Invalid or expired token"),
        },
        tags=["auth"],
    ),
)
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            verify_email(token=serializer.validated_data["token"])
        except ValidationError as exc:
            return Response(
                {"detail": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Email verified successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_resend_verification",
        summary="Resend email verification link",
        request=ResendVerificationSerializer,
        responses={
            200: OpenApiResponse(description="If the account exists and is unverified, a new link has been sent."),
        },
        tags=["auth"],
    ),
)
class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            resend_verification(email=serializer.validated_data["email"])
        except ValidationError as exc:
            if exc.detail == "Email already verified":
                logger.info("Resend requested for already-verified email: %s", serializer.validated_data["email"])

        return Response(
            {"detail": "If that account exists and is unverified, a new link has been sent."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_login",
        summary="Log in with email and password",
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login successful. Access and refresh tokens set as httpOnly cookies."),
            401: OpenApiResponse(description="Invalid credentials"),
        },
        tags=["auth"],
    ),
)
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            access_token, refresh_token = login_user(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
            )
        except AuthenticationFailed as exc:
            return Response(
                {"detail": exc.detail},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(
            {"detail": "Login successful."},
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(response, access_token, refresh_token)
        return response


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_logout",
        summary="Log out and blacklist refresh token",
        request=None,
        responses={
            200: OpenApiResponse(description="Logged out. Auth cookies cleared."),
        },
        tags=["auth"],
    ),
)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        raw_refresh = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"])
        if raw_refresh:
            try:
                token = RefreshToken(raw_refresh)
                token.blacklist()
            except TokenError:
                pass

        response = Response(
            {"detail": "Logged out."},
            status=status.HTTP_200_OK,
        )
        clear_auth_cookies(response)
        return response


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_token_refresh",
        summary="Refresh access token using refresh cookie",
        request=None,
        responses={
            200: OpenApiResponse(description="Token refreshed. New access/refresh tokens set as httpOnly cookies."),
            401: OpenApiResponse(description="Invalid or expired refresh token"),
        },
        tags=["auth"],
    ),
)
class TokenRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        raw_refresh = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"])
        if raw_refresh is None:
            raise AuthenticationFailed("No refresh token provided")

        try:
            old_refresh = RefreshToken(raw_refresh)
            new_access = str(old_refresh.access_token)
            new_refresh = str(old_refresh)
        except TokenError as exc:
            raise AuthenticationFailed(str(exc))

        response = Response(
            {"detail": "Token refreshed."},
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(response, new_access, new_refresh)
        return response


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_password_reset_request",
        summary="Request password reset email",
        request=PasswordResetRequestSerializer,
        responses={
            200: OpenApiResponse(description="If the account exists, a reset link has been sent."),
        },
        tags=["auth"],
    ),
)
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request_password_reset(email=serializer.validated_data["email"])

        return Response(
            {"detail": "If that account exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_password_reset_confirm",
        summary="Confirm password reset with token",
        request=PasswordResetConfirmSerializer,
        responses={
            200: OpenApiResponse(description="Password reset successfully."),
            400: OpenApiResponse(description="Invalid or expired token, or weak password"),
        },
        tags=["auth"],
    ),
)
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            confirm_password_reset(
                token=serializer.validated_data["token"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValidationError as exc:
            return Response(
                {"detail": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Password reset successfully. Please log in."},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(
        operation_id="auth_get_profile",
        summary="Get current user profile",
        responses={200: UserProfileSerializer},
        tags=["auth"],
    ),
    patch=extend_schema(
        operation_id="auth_update_profile",
        summary="Update current user profile",
        request=UpdateProfileSerializer,
        responses={
            200: UserProfileSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
        tags=["auth"],
    ),
)
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get(self, request, *args, **kwargs):
        user = get_user_profile(user_id=request.user.id)
        return Response(
            UserProfileSerializer(user).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, *args, **kwargs):
        serializer = UpdateProfileSerializer(
            data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)

        try:
            updated_user = update_user_profile(
                user=request.user, **serializer.validated_data
            )
        except ValidationError as exc:
            return Response(
                {"detail": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            UserProfileSerializer(updated_user).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        operation_id="auth_data_export",
        summary="Request a data export (GDPR/DPDP)",
        request=None,
        responses={
            202: OpenApiResponse(description="Data export queued. An email will be sent when ready."),
        },
        tags=["auth"],
    ),
)
class DataExportView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        request_data_export(user=request.user)
        return Response(
            {"detail": "Your data export has been queued. You will receive an email shortly."},
            status=status.HTTP_202_ACCEPTED,
        )


@extend_schema_view(
    delete=extend_schema(
        operation_id="auth_account_delete",
        summary="Delete (anonymize) user account",
        request=DeleteAccountSerializer,
        responses={
            200: OpenApiResponse(description="Account deleted. Auth cookies cleared."),
            400: OpenApiResponse(description="Incorrect password"),
        },
        tags=["auth"],
    ),
)
class AccountDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["delete"]

    def delete(self, request, *args, **kwargs):
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            delete_account(
                user=request.user, password=serializer.validated_data["password"]
            )
        except ValidationError as exc:
            return Response(
                {"detail": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = Response(
            {"detail": "Account deleted. We're sorry to see you go."},
            status=status.HTTP_200_OK,
        )
        clear_auth_cookies(response)
        return response
