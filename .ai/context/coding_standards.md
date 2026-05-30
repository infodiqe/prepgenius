# Coding Standards (summary)

Full enforceable rules live in root `CLAUDE.md` / `AGENTS.md`. Highlights:

**Backend (Django/DRF):** layering `api/` (thin) → `services/` (writes, transactions) → `selectors/` (reads) → `models/` → `tasks/`. No business logic in views/serializers. Typed Python. `/api/v1/`. `ai_gateway` is the only module that calls AI providers; `credits` is the only module that mutates balances.

**Frontend (Next.js/TS):** App Router, server components for reads, generated typed API client, httpOnly-cookie auth (no localStorage tokens), Assamese-default i18n, no business logic client-side, server-authoritative exam timer, idempotent offline-buffered answers.

**Database:** every change via migration; index every FK; NUMERIC for money; append-only ledger; tenant scoping by `institution_id`.

**Testing:** services, credit ledger (double-spend), scoring, review state machine, RBAC/tenant isolation, AI fallback (mocked). No live external calls in CI.

**Async:** Celery queues `default`/`ai`/`ingest`/`analytics`; idempotent, retry-safe.
