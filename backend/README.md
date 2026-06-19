# Backend (Django + DRF, modular monolith)

Apps = domains (accounts, exams, questionbank, examengine, analytics, aitutor, aigen, contentops, institutions, credits, payments, notifications, ai_gateway). Unit tests live per app. See `docs/architecture/system_architecture.md`.

## Tests

```bash
cd backend
pip install -r requirements.txt
SECRET_KEY=dev-only pytest
```

`pytest` reads `pyproject.toml`, which pins `--ds=config.settings.test`. The test
settings use SQLite in-memory, local-memory cache, and eager Celery, so **no
Postgres or Redis is required** to run the suite. External providers (AI,
Razorpay, Twilio, Telegram) are mocked — the suite makes no live calls.

## Seeding & activation readiness

Provision a fresh database with the single idempotent orchestrator (it runs all
seed commands in dependency order — roles, CTET exam/taxonomy, previous-year
papers, questions, approvals, and the CTET diagnostic mock test):

```bash
python manage.py migrate
python manage.py seed_all
python manage.py verify_diagnostic_readiness   # read-only readiness gate
```

`verify_diagnostic_readiness` exits non-zero if any activation prerequisite is
missing (exam, published diagnostic mock test, question mappings,
`blueprint.diagnostic_mock_test_id`). Full operator runbook — required services,
Celery/email requirements, and the end-to-end validation procedure — is in
[`docs/operations/activation-readiness.md`](../docs/operations/activation-readiness.md).

## Scheduled tasks (Celery Beat)

Periodic tasks are defined in `CELERY_BEAT_SCHEDULE` (`config/settings/base.py`)
and run by the `celery-beat` service using the DB-backed `DatabaseScheduler`.

- **`auto-submit-expired-attempts`** (every 60s, `default` queue) — finalizes any
  in-progress attempt whose server-authoritative timer has elapsed even if the
  client never submitted. The handler (`attempts.services.submit_expired_attempts`)
  locks each attempt with `select_for_update(skip_locked=True)` and re-checks
  status, so it is idempotent and safe to run alongside manual submits.

## Continuous Integration

`.github/workflows/ci.yml` runs two independent, parallel jobs on every push to
`main`/`master` and on every pull request:

- **`backend-tests`** — installs `requirements.txt` and runs the full `pytest`
  suite under `config.settings.test`. Because those settings are hermetic
  (SQLite in-memory, LocMemCache, eager Celery), the job needs no service
  containers — only a throwaway `SECRET_KEY`. The hermetic-settings invariant is
  itself guarded by `config/tests/test_settings_hermetic.py`; if a setting starts
  requiring an external service, provision it in the workflow before merging.
- **`migration-checks`** — validates the *production* migration path under
  `config.settings.prod` against a real `pgvector/pgvector:pg16` Postgres service.
  It detects migration drift (`makemigrations --check --dry-run`), bootstraps the
  same extensions production creates by applying
  `infrastructure/docker/postgres/init.sql` (the bare CI Postgres service does not
  auto-run it), applies all migrations on a fresh DB (`migrate --noinput`), and
  runs Django system checks (`check`). It runs **no** tests, so the suite is never
  executed twice. Note: because the `vector` extension is created by `init.sql`
  rather than a migration, that bootstrap step is required before `migrate`.
