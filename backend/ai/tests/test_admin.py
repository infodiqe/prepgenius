import pytest
from django.contrib import admin

from ai.admin import AIRequestAdmin
from ai.models import AIRequest
from ai.tests.factories import AIRequestFactory

pytestmark = pytest.mark.django_db


class TestAIRequestAdmin:
    def test_registered(self):
        assert AIRequest in admin.site._registry
        assert isinstance(admin.site._registry[AIRequest], AIRequestAdmin)

    def test_is_read_only(self):
        model_admin = admin.site._registry[AIRequest]
        assert model_admin.has_add_permission(None) is False
        assert model_admin.has_change_permission(None) is False
        assert model_admin.has_delete_permission(None) is False

    def test_list_display_fields_exist(self):
        model_admin = admin.site._registry[AIRequest]
        req = AIRequestFactory()
        for field_name in model_admin.list_display:
            # Attribute must resolve on the instance (audit fields are all real columns).
            assert hasattr(req, field_name)
