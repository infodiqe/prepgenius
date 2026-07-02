import pytest
from django.contrib import admin

from ai.admin import AIQuestionDraftAdmin
from ai.models import AIQuestionDraft
from ai.tests.factories import AIQuestionDraftFactory

pytestmark = pytest.mark.django_db


class TestAIQuestionDraftAdmin:
    def test_registered(self):
        assert AIQuestionDraft in admin.site._registry
        assert isinstance(admin.site._registry[AIQuestionDraft], AIQuestionDraftAdmin)

    def test_read_only(self):
        model_admin = admin.site._registry[AIQuestionDraft]
        assert model_admin.has_add_permission(None) is False
        assert model_admin.has_change_permission(None) is False
        assert model_admin.has_delete_permission(None) is False

    def test_required_search_and_filters(self):
        model_admin = admin.site._registry[AIQuestionDraft]
        for f in ("provider", "model", "created_by__email", "status"):
            assert f in model_admin.search_fields
        for f in ("exam", "subject", "topic", "difficulty", "language", "status", "created_at"):
            assert f in model_admin.list_filter

    def test_list_display_resolves(self):
        model_admin = admin.site._registry[AIQuestionDraft]
        draft = AIQuestionDraftFactory()
        for field_name in model_admin.list_display:
            assert hasattr(draft, field_name)
