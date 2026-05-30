"""Root pytest configuration. All fixtures live in app-level conftest.py files."""
import django
import pytest
from django.conf import settings


@pytest.fixture(autouse=True)
def reset_db_sequences():
    """Yield — placeholder for per-test DB sequence resets if needed."""
    yield
