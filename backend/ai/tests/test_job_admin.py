from datetime import timedelta

import pytest
from django.contrib import admin
from django.utils import timezone

from ai.admin import AIGenerationJobAdmin
from ai.models import AIGenerationJob

pytestmark = pytest.mark.django_db


class TestAIGenerationJobAdmin:
    def test_registered_read_only(self):
        model_admin = admin.site._registry[AIGenerationJob]
        assert isinstance(model_admin, AIGenerationJobAdmin)
        assert model_admin.has_add_permission(None) is False
        assert model_admin.has_change_permission(None) is False
        assert model_admin.has_delete_permission(None) is False

    def test_duration_display(self):
        model_admin = admin.site._registry[AIGenerationJob]
        now = timezone.now()
        job = AIGenerationJob.objects.create(
            requested_count=1, started_at=now, completed_at=now + timedelta(seconds=3)
        )
        assert model_admin.duration(job) == "3.0"
        pending = AIGenerationJob.objects.create(requested_count=1)
        assert model_admin.duration(pending) == "—"

    def test_required_list_display(self):
        model_admin = admin.site._registry[AIGenerationJob]
        for f in ("status", "progress", "duration", "provider", "model", "created_by"):
            assert f in model_admin.list_display
