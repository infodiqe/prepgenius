import pytest

from .factories import CMSBlockFactory, CMSPageFactory, DraftCMSPageFactory

pytestmark = pytest.mark.django_db


class TestPublicCMSPageDetail:
    def test_published_page_returns_ordered_blocks(
        self, anonymous_client, published_page
    ):
        response = anonymous_client.get("/api/v1/cms/pages/about-us/?locale=as")
        assert response.status_code == 200
        body = response.json()
        assert body["slug"] == "about-us"
        assert body["locale"] == "as"
        assert [b["block_type"] for b in body["blocks"]] == ["rich_text", "hero"]

    def test_defaults_to_assamese_when_no_locale(
        self, anonymous_client, published_page
    ):
        response = anonymous_client.get("/api/v1/cms/pages/about-us/")
        assert response.status_code == 200
        assert response.json()["locale"] == "as"

    def test_draft_returns_404(self, anonymous_client):
        DraftCMSPageFactory(slug="secret", locale="as")
        response = anonymous_client.get("/api/v1/cms/pages/secret/?locale=as")
        assert response.status_code == 404

    def test_unknown_slug_returns_404(self, anonymous_client):
        response = anonymous_client.get("/api/v1/cms/pages/nope/?locale=as")
        assert response.status_code == 404

    def test_wrong_locale_returns_404(self, anonymous_client):
        CMSPageFactory(slug="only-as", locale="as", status="published")
        response = anonymous_client.get("/api/v1/cms/pages/only-as/?locale=en")
        assert response.status_code == 404


class TestPublicCMSPageList:
    def test_lists_only_published(self, anonymous_client):
        CMSPageFactory(slug="pub-1", status="published")
        DraftCMSPageFactory(slug="draft-1")
        response = anonymous_client.get("/api/v1/cms/pages/")
        assert response.status_code == 200
        slugs = {p["slug"] for p in response.json()}
        assert slugs == {"pub-1"}
