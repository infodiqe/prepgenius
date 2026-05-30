import uuid

from django.conf import settings
from django.db import models


class UserConsent(models.Model):
    """
    DPDP-compliant consent record (§22).
    Every signup logs a ``data_processing`` consent; minor accounts also
    log a ``parental`` consent.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consents",
    )
    purpose = models.CharField(max_length=80)
    consent_version = models.CharField(max_length=20)
    granted = models.BooleanField()
    is_parental = models.BooleanField(default=False)
    guardian_ref = models.CharField(max_length=150, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "purpose"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} {self.purpose} {'granted' if self.granted else 'denied'}"
