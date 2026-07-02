"""Production settings."""
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403
from .base import SECRET_KEY, env

DEBUG = False

ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# RC-03 (P1-7): refuse to boot production on a placeholder/insecure secret or a
# default database password. .env.example ships obvious placeholders; without
# this guard an operator who copies it unedited would run prod on a public key.
# The local dev stack also loads this settings module (behind HTTP-only nginx),
# so it sets ALLOW_INSECURE_SECRET_KEY=true to opt out — real production never
# sets that flag, keeping the guard active where it matters.
if not env.bool("ALLOW_INSECURE_SECRET_KEY", default=False):
    if (
        not SECRET_KEY
        or SECRET_KEY.startswith("django-insecure")
        or "change-me" in SECRET_KEY
        or len(SECRET_KEY) < 50
    ):
        raise ImproperlyConfigured(
            "SECRET_KEY must be a strong, unique value in production "
            "(>=50 chars, not the django-insecure/change-me placeholder). "
            "Set ALLOW_INSECURE_SECRET_KEY=true only for local development."
        )
    if "change-me" in env("DATABASE_URL", default=""):
        raise ImproperlyConfigured(
            "DATABASE_URL still contains the 'change-me' placeholder password; "
            "set a strong database password in production."
        )

# ── Security hardening ────────────────────────────────────────────────────────
# Secure-by-default: every flag defaults to its hardened value, so production is
# unchanged. They are env-overridable only so a prod-image stack running behind
# HTTP-only nginx (local docker dev) can opt out of HTTPS enforcement and avoid
# the HTTP→HTTPS 301 that an HTTP-only proxy turns into a 502.

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)

# RC-02B: TLS terminates at nginx, which forwards the original scheme in
# X-Forwarded-Proto. Without this, Django sees the proxied request as plain HTTP
# and SECURE_SSL_REDIRECT would 301 it back to HTTPS in a loop. Trusting the
# proxy header lets SSL redirect + Secure-cookie detection work correctly.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# The container healthcheck probes http://localhost:8000/healthz/ internally
# (no proxy, plain HTTP), so it must be exempt from the HTTPS redirect.
SECURE_REDIRECT_EXEMPT = [r"^healthz/$"]

# ── Static files ──────────────────────────────────────────────────────────────

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

# ── Email ─────────────────────────────────────────────────────────────────────

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@prepgenius.ai")

# ── Sentry ────────────────────────────────────────────────────────────────────

SENTRY_DSN = env("SENTRY_DSN", default="")

if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
