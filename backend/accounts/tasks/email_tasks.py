import logging

from django.conf import settings
from django.core.mail import send_mail
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue="default", max_retries=0)
def send_verification_email(self, user_id: str, token: str) -> None:
    from accounts.models import User

    try:
        user = User.objects.get(id=user_id, status__in=("pending", "active"))
    except User.DoesNotExist:
        logger.warning("send_verification_email: user %s not found", user_id)
        return

    verify_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={token}"
    subject = "Verify your PrepGenius email"
    body = (
        f"Hi {user.full_name},\n\n"
        f"Thank you for creating a PrepGenius account.\n\n"
        f"Please verify your email address by clicking the link below:\n\n"
        f"{verify_url}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"If you did not create an account, you can ignore this email.\n\n"
        f"Best,\nThe PrepGenius Team"
    )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Verification email sent to %s", user.email)
    except Exception:
        logger.exception("Failed to send verification email to %s", user.email)


@shared_task(bind=True, queue="default", max_retries=0)
def send_password_reset_email(self, user_id: str, token: str) -> None:
    from accounts.models import User

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.warning("send_password_reset_email: user %s not found", user_id)
        return

    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"
    subject = "Reset your PrepGenius password"
    body = (
        f"Hi {user.full_name},\n\n"
        f"We received a request to reset your PrepGenius password.\n\n"
        f"Please click the link below to set a new password:\n\n"
        f"{reset_url}\n\n"
        f"This link expires in 1 hour.\n\n"
        f"If you did not request a password reset, you can ignore this email.\n\n"
        f"Best,\nThe PrepGenius Team"
    )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Password reset email sent to %s", user.email)
    except Exception:
        logger.exception("Failed to send password reset email to %s", user.email)
