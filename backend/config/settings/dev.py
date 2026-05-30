"""Development settings — never use in production."""
from .base import *  # noqa: F401, F403
from .base import INSTALLED_APPS, MIDDLEWARE, env

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

INSTALLED_APPS += ["debug_toolbar"]

MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE

INTERNAL_IPS = ["127.0.0.1"]

# Use synchronous SQLite for faster test runs when DATABASE_URL is not set
DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://postgres:postgres@localhost:5432/prepgenius_dev"),
}
DATABASES["default"]["ATOMIC_REQUESTS"] = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
