from django.urls import path

from accounts.api.views import (
    AccountDeleteView,
    DataExportView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    ResendVerificationView,
    TokenRefreshView,
    VerifyEmailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("password/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-confirm"),
    path("profile/", ProfileView.as_view(), name="auth-profile"),
    path("data/export/", DataExportView.as_view(), name="auth-data-export"),
    path("account/delete/", AccountDeleteView.as_view(), name="auth-account-delete"),
]
