"""Test settings — SQLite backend for fast test runs. No PostgreSQL required."""
from .dev import *  # noqa: F401, F403

# Override database to SQLite for test speed and isolation
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "ATOMIC_REQUESTS": True,
    }
}

# Disable debug toolbar in tests
INSTALLED_APPS = [a for a in INSTALLED_APPS if a != "debug_toolbar"]  # noqa: F405
MIDDLEWARE = [m for m in MIDDLEWARE if "debug_toolbar" not in m]  # noqa: F405

# Use local memory cache instead of Redis so tests don't need a running Redis
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# High throttle rates in tests so test order doesn't trigger rate limits unexpectedly.
# Tests that verify rate-limiting behaviour use cache.clear() + patch.dict locally.
from rest_framework.settings import api_settings  # noqa: E402
api_settings.DEFAULT_THROTTLE_RATES.update({  # noqa: E402
    "anon": "10000/hour",
    "user": "10000/hour",
    "login": "10000/minute",
    "otp": "10000/minute",
})


