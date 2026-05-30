import json
import logging

from django.conf import settings
from django.core.mail import send_mail
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue="default", max_retries=0)
def export_user_data_async(self, user_id: str) -> None:
    from accounts.models import User

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.warning("export_user_data_async: user %s not found", user_id)
        return

    if user.status == "deleted":
        logger.info("export_user_data_async: user %s is deleted, skipping", user_id)
        return

    consents = list(user.consents.values("purpose", "consent_version", "granted", "granted_at"))

    export_data = {
        "user_id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "preferred_language": user.preferred_language,
        "status": user.status,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "consents": consents,
    }

    subject = "Your PrepGenius data export"
    body = (
        f"Hi {user.full_name},\n\n"
        f"As requested, here is the data we have stored for your PrepGenius account.\n\n"
        f"-----\n"
        f"{json.dumps(export_data, indent=2, default=str)}\n"
        f"-----\n\n"
        f"This data is provided in JSON format.\n\n"
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
        logger.info("Data export email sent to %s for user %s", user.email, user_id)
    except Exception:
        logger.exception("Failed to send data export email to %s", user.email)
