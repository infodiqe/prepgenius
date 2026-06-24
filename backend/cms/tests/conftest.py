"""Shared fixtures for cms app tests."""
import pytest
from rest_framework.test import APIClient

from .factories import CMSBlockFactory, CMSGuideFactory, CMSPageFactory


@pytest.fixture
def anonymous_client():
    return APIClient()


@pytest.fixture
def published_page():
    """A published page with two blocks created out of sort order."""
    page = CMSPageFactory(slug="about-us", locale="as", status="published")
    CMSBlockFactory(page=page, block_type="hero", sort_order=1, content={"title": "Hi"})
    CMSBlockFactory(
        page=page, block_type="rich_text", sort_order=0, content={"html": "<p>x</p>"}
    )
    return page


@pytest.fixture
def published_guide():
    """A published study guide with two blocks created out of sort order."""
    guide = CMSGuideFactory(
        slug="how-to-ctet", locale="as", category="CTET", status="published"
    )
    CMSBlockFactory(
        page=guide, block_type="hero", sort_order=1, content={"title": "How to"}
    )
    CMSBlockFactory(
        page=guide,
        block_type="rich_text",
        sort_order=0,
        content={"heading": "Step 1", "html": "<p>Start</p>"},
    )
    return guide
