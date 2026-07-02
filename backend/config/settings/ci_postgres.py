"""CI settings for the concurrency / row-lock test job (RC-03 P1-6).

Identical to the fast `test` settings (eager Celery, LocMem cache, high throttle
rates, debug-toolbar stripped) EXCEPT the database is the real PostgreSQL
service instead of in-memory SQLite — so `select_for_update` row locks are
actually enforced and `@pytest.mark.concurrency` tests run for real.

Used only by the CI `concurrency-tests` job:
    pytest -m concurrency --ds=config.settings.ci_postgres
"""
from .test import *  # noqa: F401, F403
from .base import env  # noqa: E402

# Real Postgres (from DATABASE_URL) rather than the SQLite override in test.py.
DATABASES = {"default": env.db("DATABASE_URL")}  # noqa: F405
# The concurrency tests open their own threads/transactions; do not wrap each
# request in an atomic block.
DATABASES["default"]["ATOMIC_REQUESTS"] = False
