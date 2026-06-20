import pytest

pytestmark = pytest.mark.django_db


class TestPublicCMSEndpointPermissions:
    """The public CMS endpoint is anonymous, read-only."""

    def test_anonymous_can_read_published(self, anonymous_client, published_page):
        response = anonymous_client.get("/api/v1/cms/pages/about-us/?locale=as")
        assert response.status_code == 200

    def test_anonymous_can_read_list(self, anonymous_client, published_page):
        assert anonymous_client.get("/api/v1/cms/pages/").status_code == 200

    @pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
    def test_write_methods_not_allowed(self, anonymous_client, method):
        response = getattr(anonymous_client, method)(
            "/api/v1/cms/pages/about-us/?locale=as"
        )
        assert response.status_code == 405

    @pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
    def test_write_methods_not_allowed_on_list(self, anonymous_client, method):
        assert getattr(anonymous_client, method)("/api/v1/cms/pages/").status_code == 405
