import pytest

from .factories import (
    CMSBlockFactory,
    CMSGuideFactory,
    CMSPageFactory,
    DraftCMSPageFactory,
)

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

    def test_excludes_guides(self, anonymous_client):
        CMSPageFactory(slug="page-1", status="published")
        CMSGuideFactory(slug="guide-1", status="published")
        response = anonymous_client.get("/api/v1/cms/pages/")
        slugs = {p["slug"] for p in response.json()}
        assert slugs == {"page-1"}

    def test_guide_not_served_as_generic_page(self, anonymous_client):
        CMSGuideFactory(slug="how-to-ctet", locale="as", status="published")
        response = anonymous_client.get("/api/v1/cms/pages/how-to-ctet/?locale=as")
        assert response.status_code == 404


class TestPublicGuideList:
    def test_lists_published_guides_for_locale(self, anonymous_client):
        CMSGuideFactory(slug="g-as", locale="as", category="CTET")
        CMSGuideFactory(slug="g-en", locale="en", category="CTET")
        CMSPageFactory(slug="plain", locale="as", status="published")
        response = anonymous_client.get("/api/v1/cms/guides/?locale=as")
        assert response.status_code == 200
        body = response.json()
        slugs = {g["slug"] for g in body}
        assert slugs == {"g-as"}
        assert set(body[0].keys()) == {
            "slug",
            "title",
            "meta_description",
            "category",
        }

    def test_defaults_to_assamese(self, anonymous_client):
        CMSGuideFactory(slug="g-as", locale="as")
        CMSGuideFactory(slug="g-en", locale="en")
        response = anonymous_client.get("/api/v1/cms/guides/")
        assert {g["slug"] for g in response.json()} == {"g-as"}


class TestPublicGuideDetail:
    def test_published_guide_returns_blocks_and_related(self, anonymous_client):
        guide = CMSGuideFactory(slug="how-to", locale="as", category="CTET")
        CMSBlockFactory(page=guide, block_type="rich_text", sort_order=1)
        CMSBlockFactory(page=guide, block_type="hero", sort_order=0)
        CMSGuideFactory(slug="sibling", locale="as", category="CTET")

        response = anonymous_client.get("/api/v1/cms/guides/how-to/?locale=as")
        assert response.status_code == 200
        body = response.json()
        assert body["slug"] == "how-to"
        assert body["category"] == "CTET"
        assert [b["block_type"] for b in body["blocks"]] == ["hero", "rich_text"]
        assert [r["slug"] for r in body["related"]] == ["sibling"]

    def test_draft_returns_404(self, anonymous_client):
        DraftCMSPageFactory(slug="secret", locale="as", page_type="guide")
        response = anonymous_client.get("/api/v1/cms/guides/secret/?locale=as")
        assert response.status_code == 404

    def test_unknown_slug_returns_404(self, anonymous_client):
        response = anonymous_client.get("/api/v1/cms/guides/nope/?locale=as")
        assert response.status_code == 404

    def test_generic_page_not_served_as_guide(self, anonymous_client):
        CMSPageFactory(slug="about", locale="as", status="published")
        response = anonymous_client.get("/api/v1/cms/guides/about/?locale=as")
        assert response.status_code == 404
