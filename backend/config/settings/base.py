"""
Base settings shared across all environments.
PRD v4 §2 (architecture), §5 (auth), §13 (credits), §18 (security).
"""
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
)

environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# ── Application definition ────────────────────────────────────────────────────

DJANGO_APPS = [
    # django-unfold must precede django.contrib.admin to override admin templates.
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "django_celery_beat",
    "django_celery_results",
    "django_extensions",
]

LOCAL_APPS = [
    "accounts.apps.AccountsConfig",
    "exams.apps.ExamsConfig",
    "questions.apps.QuestionsConfig",
    "attempts.apps.AttemptsConfig",
    "analytics.apps.AnalyticsConfig",
    "ai.apps.AiConfig",
    "credits.apps.CreditsConfig",
    "notifications.apps.NotificationsConfig",
    "institutions.apps.InstitutionsConfig",
    "content_review.apps.ContentReviewConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ── Database ─────────────────────────────────────────────────────────────────
# PRD v4 §5 (PostgreSQL + pgvector, NUMERIC credits, append-only ledger)

DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://postgres:postgres@db:5432/prepgenius"),
}
DATABASES["default"]["ATOMIC_REQUESTS"] = True

# ── Cache / Redis ─────────────────────────────────────────────────────────────

REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "TIMEOUT": 300,
    }
}

# ── Authentication ────────────────────────────────────────────────────────────
# PRD v4 §5 — Argon2 hashing, httpOnly JWT cookies (simplejwt)

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# ── Django REST Framework ─────────────────────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.CursorPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/hour",
        "user": "1000/hour",
        "login": "5/minute",
        "otp": "3/minute",
    },
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# ── JWT ───────────────────────────────────────────────────────────────────────

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_REFRESH": "refresh_token",
    # Secure-by-default. Env-overridable only so a stack served over HTTP
    # (local docker dev) can issue cookies the browser will actually store;
    # a Secure cookie is silently dropped by browsers over plain HTTP.
    "AUTH_COOKIE_SECURE": env.bool("AUTH_COOKIE_SECURE", default=True),
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": "Lax",
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── Account lockout (PH-4 — §6 rate-limit auth) ────────────────────────────────
# Per-account brute-force protection layered on top of the per-IP login throttle.
# After ACCOUNT_LOCKOUT_THRESHOLD consecutive failed logins, the account is locked
# for ACCOUNT_LOCKOUT_WINDOW. Both are configurable so ops can tune them per env.
ACCOUNT_LOCKOUT_THRESHOLD = env.int("ACCOUNT_LOCKOUT_THRESHOLD", default=5)
ACCOUNT_LOCKOUT_WINDOW = timedelta(
    minutes=env.int("ACCOUNT_LOCKOUT_WINDOW_MINUTES", default=15)
)

# ── CORS ──────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

# ── OpenAPI (drf-spectacular) ─────────────────────────────────────────────────

SPECTACULAR_SETTINGS = {
    "TITLE": "PrepGenius API",
    "DESCRIPTION": "PrepGenius Competitive Exam Platform API",
    "VERSION": "v1",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "ExamTypeEnum": ["qualifying", "entrance", "ranked"],
    },
}

# ── Celery ────────────────────────────────────────────────────────────────────
# PRD v4 §3 — Queues: default / ai / ingest / analytics

CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/1")
CELERY_RESULT_BACKEND = "django-db"
CELERY_RESULT_EXTENDED = True
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Kolkata"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

CELERY_TASK_QUEUES_DEFAULT = "default"
CELERY_TASK_ROUTES = {
    "ai.*": {"queue": "ai"},
    "questions.tasks.*": {"queue": "ingest"},
    "analytics.tasks.*": {"queue": "analytics"},
    "notifications.tasks.*": {"queue": "default"},
}

# ── Celery Beat (periodic tasks) ───────────────────────────────────────────────
# DB-backed scheduler so the schedule survives beat restarts and is editable via
# Django Admin. The docker-compose celery-beat service also passes this scheduler
# on the command line; keeping it here makes the schedule explicit in code too.
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# PH-1.1 (Sprint 5A): finalize attempts whose server-side timer has elapsed even
# if the client never submitted. The server-authoritative timer is the source of
# truth — the client only displays the countdown — so this sweep must run server
# side. Runs every 60s on the default queue; submit_expired_attempts is
# idempotent and concurrency-safe (PH-1.2), so re-runs are harmless.
CELERY_BEAT_SCHEDULE = {
    "auto-submit-expired-attempts": {
        "task": "attempts.tasks.auto_submit_expired_attempts",
        "schedule": 60.0,
        "options": {"queue": "default"},
    },
}

# ── Internationalization ──────────────────────────────────────────────────────
# PRD v4 §4.1 — Assamese-first

from django.conf.locale import LANG_INFO  # noqa: E402

# Django ships no locale metadata for Assamese ("as"). Without it,
# get_language_info() — used by the i18n template tags and Unfold's language
# switcher — raises KeyError and 500s every authenticated admin page. Register
# it in Django's locale registry. setdefault keeps this idempotent and yields
# to any future official entry.
LANG_INFO.setdefault(
    "as",
    {
        "bidi": False,
        "code": "as",
        "name": "Assamese",
        "name_local": "অসমীয়া",
    },
)

LANGUAGE_CODE = "en"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("as", "Assamese"),
    ("en", "English"),
    ("hi", "Hindi"),
]

# ── Static & Media ────────────────────────────────────────────────────────────

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/uploads/"
MEDIA_ROOT = BASE_DIR / "uploads"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Django Admin theme (django-unfold) ────────────────────────────────────────
# Tailwind-based admin skin. Supports light/dark via the theme switcher (no
# forced THEME so users can toggle). PRD §12 (Content Ops tooling in Admin).

UNFOLD = {
    "SITE_TITLE": "PrepGenius Admin",
    "SITE_HEADER": "PrepGenius AI",
    "SITE_SUBHEADER": "Content & Operations",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
    },
    "COLORS": {
        "primary": {
            "50": "239 246 255",
            "100": "219 234 254",
            "200": "191 219 254",
            "300": "147 197 253",
            "400": "96 165 250",
            "500": "59 130 246",
            "600": "37 99 235",
            "700": "29 78 216",
            "800": "30 64 175",
            "900": "30 58 138",
            "950": "23 37 84",
        },
    },
}

# ── Logging ───────────────────────────────────────────────────────────────────

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "django.utils.log.ServerFormatter",
            "format": '{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": %(message)s}',
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# ── AI and Credit Gateway Config ──────────────────────────────────────────────
# PRD v4 §5.2 (credits), §7 (AI gateway)

CREDIT_FREE_MONTHLY_GRANT = env.int("CREDIT_FREE_MONTHLY_GRANT", default=100)

# Credit cost mappings per operation:
# {operation: {"reserve_estimate": reserve, "token_to_credit": rate}}
CREDIT_COSTS = env.json(
    "CREDIT_COSTS",
    default={
        "tutor_chat": {
            "reserve_estimate": 10.0,
            "token_to_credit": 0.05
        },
        "explain_question": {
            "reserve_estimate": 5.0,
            "token_to_credit": 0.05
        }
    }
)

# Provider key env vars - only accessible on the backend
GROQ_API_KEY = env("GROQ_API_KEY", default="")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
DEEPSEEK_API_KEY = env("DEEPSEEK_API_KEY", default="")

# Order of providers to try when executing an AI prompt (fallback chain)
AI_PROVIDER_CHAIN = env.list(
    "AI_PROVIDER_CHAIN",
    default=env.list("AI_PROVIDER_ORDER", default=["groq", "openai", "deepseek"])
)

# Mapping of operations to models per provider
AI_MODELS = env.json(
    "AI_MODELS",
    default={
        "tutor_chat": {
            "groq": "llama-3.3-70b-versatile",
            "openai": "gpt-4o-mini",
            "deepseek": "deepseek-chat",
            "mock": "mock-model"
        },
        "explain_question": {
            "groq": "llama-3.3-70b-versatile",
            "openai": "gpt-4o-mini",
            "deepseek": "deepseek-chat",
            "mock": "mock-model"
        }
    }
)

# ── Email ─────────────────────────────────────────────────────────────────────

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@prepgenius.ai")

# ── Frontend URL (for email links, etc.) ──────────────────────────────────────

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# ── Content review publish policy (PH-3 — §8 content trust) ───────────────────
# Approval level(s) that satisfy publishing a question. The review workflow
# records exactly one ContentApproval per question — "reviewer" via
# draft→in_review→approved, or "sme" via …→sme_review→approved — so the policy is
# expressed as the SET of approval levels accepted for publish:
#   • default → a reviewer OR sme approval suffices
#   • strict  → only an SME approval suffices (forces the reviewer→SME branch)
# "strict" applies to higher-risk content, resolved from data (not hardcoded
# exams): AI-generated origin, minor-audience exams, or an exam_rules flag
# `requires_sme_review`. Fully overridable via env for per-environment tuning.
CONTENT_REVIEW_PUBLISH_POLICY = env.json(
    "CONTENT_REVIEW_PUBLISH_POLICY",
    default={
        "default": ["reviewer", "sme"],
        "strict": ["sme"],
    },
)

# ── DPDP consent ─────────────────────────────────────────────────────────────

CONSENT_VERSION = "v1.0"

# ── Security defaults ─────────────────────────────────────────────────────────

SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}