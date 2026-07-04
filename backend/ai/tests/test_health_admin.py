"""ProviderHealth admin — read-only monitoring (Sprint-6B-01, Task 7)."""
import pytest
from django.contrib import admin

from ai.admin import ProviderHealthAdmin
from ai.models import ProviderHealth

pytestmark = pytest.mark.django_db


class TestProviderHealthAdmin:
    def test_registered(self):
        assert ProviderHealth in admin.site._registry
        assert isinstance(admin.site._registry[ProviderHealth], ProviderHealthAdmin)

    def test_is_read_only(self):
        model_admin = admin.site._registry[ProviderHealth]
        assert model_admin.has_add_permission(None) is False
        assert model_admin.has_change_permission(None) is False
        assert model_admin.has_delete_permission(None) is False

    def test_success_rate_display(self):
        model_admin = admin.site._registry[ProviderHealth]
        row = ProviderHealth.objects.create(
            provider="groq", success_count=3, failure_count=1
        )
        assert model_admin.success_rate_display(row) == "75%"
