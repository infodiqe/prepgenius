"""Guards the invariant the CI test suite depends on (Sprint 5A PH-6.1).

The GitHub Actions ``backend-tests`` job (.github/workflows/ci.yml) runs the
suite with no Postgres/Redis service containers. That only works because
``config.settings.test`` is hermetic: SQLite in-memory, local-memory cache, and
eager Celery. If any of these assertions start failing, a setting now requires
an external service — provision it in the CI workflow before merging, otherwise
CI will break for everyone.
"""
from django.conf import settings


def test_database_is_sqlite_in_memory() -> None:
    default = settings.DATABASES["default"]
    assert default["ENGINE"] == "django.db.backends.sqlite3"
    # Django's test runner rewrites an in-memory SQLite NAME to a shared-cache
    # URI (file:memorydb_default?mode=memory&cache=shared) for the duration of
    # the session, so accept any in-memory form rather than the literal value.
    name = str(default.get("NAME") or "")
    assert ":memory:" in name or "mode=memory" in name


def test_cache_is_local_memory() -> None:
    assert (
        settings.CACHES["default"]["BACKEND"]
        == "django.core.cache.backends.locmem.LocMemCache"
    )


def test_celery_runs_eagerly_without_a_broker() -> None:
    assert settings.CELERY_TASK_ALWAYS_EAGER is True
