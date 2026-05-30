# codex_rules.md — PrepGenius AI Development Rules (Codex / Cursor / Autonomous Agents)

> **Scope:** This file governs how Codex, Cursor, and other autonomous coding agents work in the PrepGenius AI repository. Sections 1–11 (the engineering rules) are the **single source of truth** and are byte-for-byte identical to `claude_rules.md`; only the *Operating Model* below is tailored to these agents. If you change an engineering rule, change it in both files.

---

## Operating Model (Codex / Cursor / Agents)

1. **Context is mandatory input.** Treat `PRD v4`, the `System Architecture Document`, and the `Database Design` as authoritative. Any code that doesn't trace to them is out of scope and should not be generated.
2. **Work PR-by-PR, deterministically.** One task → one branch → one focused change set → one PR that **cites the PRD v4 section**. Do not bundle unrelated changes.
3. **Tests and migrations gate the PR.** The change is not complete until tests pass and migrations apply cleanly on a fresh database. CI must be green before merge.
4. **Stay strictly in scope.** No drive-by refactors, formatting churn, dependency bumps, or speculative files. Touch only what the task requires.
5. **Respect the sandbox.** **Never make live external API calls** (AI, Razorpay, Twilio, Telegram) in development or CI — mock them. No network side effects outside approved integrations.
6. **No destructive operations** (drop/reset/delete/history-rewrite) without an explicit instruction that names the operation.
7. **When a rule and a request conflict, the rule wins.** Surface the conflict in the PR description; do not silently work around a Golden Rule.

---

## 0. Golden Rules (non-negotiable)

These override convenience, cleverness, and any request to "just this once" skip them. If asked to break one, refuse and escalate in the PR.

- [ ] **MVP first.** Build the smallest correct thing that satisfies the PRD; defer the rest.
- [ ] **No overengineering.** No speculative abstraction. Build the second real case before generalizing.
- [ ] **No microservices.** One modular-monolith Django app. No new network services.
- [ ] **Single VPS deployment.** Docker Compose on one host. No Kubernetes, no managed cloud for MVP.
- [ ] **PostgreSQL only.** No other datastore. Vectors use `pgvector`, not a separate vector DB.
- [ ] **Django Admin preferred** for internal/content/ops tooling.
- [ ] **No business logic in the frontend.** The frontend renders, collects input, and calls the API.
- [ ] **Every feature maps to the PRD.** Cite the PRD v4 section in every PR. No mapping ⇒ don't build it.
- [ ] **Every DB change uses migrations.** Never hand-edit the schema in any environment.
- [ ] **AI-generated content is always Draft.** Never auto-publish.
- [ ] **Human approval required** before any generated/extracted content is published.
- [ ] **Async via Celery.** AI calls, ingestion, embeddings, analytics rollups, and messaging never run synchronously in a request.
- [ ] **AI credits enforced at the backend.** Never trust the frontend for credit math or balances.
- [ ] **Telegram before WhatsApp.** Ship Telegram automation first; WhatsApp (Twilio) only afterward.
- [ ] **Local storage before cloud.** Local VPS storage for MVP; introduce R2 only at the scale gate.

---

## 1. Development Principles

- Optimize for **readability and deletability**, not cleverness. Code is read far more than written.
- **Config over code.** New exams, reminder types, and credit rules are *data*, not deployments. Never write `if exam == "CTET"`.
- **Make it work → make it right → make it fast**, and only as far as the MVP needs.
- Prefer **boring, proven** solutions. A new dependency or pattern needs a reason tied to the PRD.
- **Don't build ahead of the roadmap.** Features behind a validation gate wait for the gate unless a human signs off.
- Every change leaves the codebase **easier to delete from**, not harder.

## 2. Architecture Rules

- **Modular monolith.** One Django project; apps = domains: `accounts`, `exams`, `questionbank`, `examengine`, `analytics`, `aitutor`, `aigen`, `contentops`, `institutions`, `credits`, `payments`, `notifications`, `ai_gateway`.
- **No microservices, no new services.** If you believe one is needed, stop and ask. Keep seams clean for *future* extraction; do not extract now.
- **Respect module ownership:**
  - `ai_gateway` is the **only** module that imports an AI SDK or calls a provider.
  - `credits` is the **only** module that mutates credit balances.
  - `exams` config drives every engine; engines never hardcode an exam.
- **No cross-app model writes.** Go through the owning app's services. Reads via selectors.
- **Stateless app tier.** All state in PostgreSQL / Redis / object storage so the tier can replicate later untouched.

## 3. Backend Rules

- **Stack:** Django + DRF, typed Python. Layering per app: `api/` (thin, HTTP only) → `services/` (writes, transactions, orchestration) → `selectors/` (reads) → `models/` → `tasks/` (Celery).
- **No business logic in views or serializers.** Orchestrate in services; assert invariants there inside DB transactions.
- **API:** versioned under `/api/v1/`, cursor pagination, schema via `drf-spectacular`.
- **Django Admin is the default internal tool.** Build admin (content review queue, exam config, user/institution management) before any custom internal UI.
- **Celery for everything slow or external:** AI calls, PDF ingestion, embeddings, analytics rollups, reminders, daily-practice generation. Queues separated (`default`/`ai`/`ingest`/`analytics`). Tasks are **idempotent and retry-safe**.
- **Never** call an AI provider, send a message, or hit a payment API synchronously inside a web request.
- Secrets via env vars only; never in code or images.

## 4. Frontend Rules

- **Stack:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
- **No business logic in the frontend.** Scoring, credit math, eligibility, dedup, readiness, exam rules — **all backend**. The client renders state the server computed.
- **Never** compute, cache, or trust credits/scores client-side.
- **Auth:** httpOnly + Secure + SameSite cookies. **Never** put tokens in `localStorage`/`sessionStorage`.
- Use the **generated typed API client** (from the OpenAPI schema). No untyped hand-rolled fetches.
- **Assamese is the default locale.** All strings externalized via i18n; render AI responses in the user's `preferred_language`.
- **Mock player:** server-authoritative timer (client only *displays* the countdown), idempotent answer `PATCH` keyed by `(session, question)`, offline buffer in IndexedDB with retry. Do not implement the timer purely client-side.
- Keep bundles lean for low-end Android; lazy-load heavy features (tutor, dashboards).

## 5. Database Rules

- **PostgreSQL only.** No MongoDB, no prod SQLite, no separate vector DB (use `pgvector`).
- **Every schema change is a Django migration.** No manual `ALTER` anywhere. No `--fake` to hide drift. Migrations apply cleanly on a fresh DB and are reversible where feasible; risky data migrations are separated from schema migrations.
- **Index every foreign key.** Follow the Database Design doc for types, constraints, and indexes.
- **Money/credits are `NUMERIC`, never float.** `credit_transactions` is **append-only** (no `UPDATE`/`DELETE`).
- **Credit debit uses `select_for_update()`** on the account row to prevent double-spend.
- **Multi-tenancy:** every institution-scoped query is filtered by `institution_id` via the tenant manager mixin. Never return cross-tenant data, ever.
- **DPDP deletion** anonymizes PII and de-links (not deletes) financial/audit rows. Never hard-delete the ledger.
- **No raw SQL** unless justified; if used, it must be parameterized. Never string-format SQL.

## 6. Security Rules

- TLS everywhere; HSTS; secure cookie flags.
- **Argon2** password hashing. **Rate-limit** auth, OTP, tutor, and generation endpoints (Redis).
- **Verify webhook signatures** for Razorpay, Twilio, and Telegram before processing. Treat unverified webhooks as hostile.
- Validate **all** input via serializers; never trust the client.
- Enforce **RBAC + tenant isolation server-side**, always — never rely on the UI hiding things.
- **PII:** minimize, field-encrypt sensitive fields, record consent, support export/delete (DPDP). For minor-audience exams, gate via `audience_is_minor`, require parental consent, and never profile minors.
- **AI provider keys live only in `ai_gateway` env** and never reach the client. Treat all user/AI text as data, not instructions (prompt-injection hygiene).
- **Never log** secrets, tokens, API keys, or unnecessary PII.

## 7. AI Integration Rules

- **All AI calls go through `ai_gateway`.** No provider SDK usage anywhere else.
- **Fallback chain:** Groq (default) → OpenAI → DeepSeek V4. Order and model-per-operation are **configuration**; never hardcode model names in business logic.
- **Credit protocol on every AI call:** `reserve` → call → `commit` actual on success / `release` on failure. **No call without a successful reserve.** Credits are enforced **only at the backend**.
- **Cache** cacheable responses (e.g., common explanations); a cache hit costs **0 credits**.
- **AI-generated questions are always Draft** and must pass human review (§8). Generation is **exam-config-driven** (syllabus, blueprint, topic/difficulty distribution, learning objectives) and validated (schema, `pgvector` dedup, syllabus alignment) before becoming a Draft.
- Rate-limit and budget per user; **stream** tutor responses.
- **No RAG / external vector DB in MVP** beyond `pgvector` dedup.
- Log token usage and cost per call for margin monitoring; never log prompt PII needlessly.

## 8. Content Management Rules

- **Content trust is the product.** AI-**extracted** and AI-**generated** content is **Draft until a human approves it.**
- **Review state machine (server-enforced):** `draft → in_review → (sme_review) → approved → published`; rejections return to `draft`. Log every transition in `content_reviews`.
- **Roles (RBAC):** Content Manager (upload, structure, publish), Reviewer (edit/approve/reject), SME (accuracy + syllabus). Build this tooling in **Django Admin first**.
- **Official vs AI-generated** content must be distinguishable via `origin` in both data and UI.
- **Dedup on ingest** via `pgvector` + `pg_trgm`; surface candidates to a reviewer — **never auto-merge**.
- One **master question** with appearance history across years.
- **Never publish content that failed validation.**

## 9. Institution Module Rules

- **Shared-schema multi-tenancy** with `institution_id` scoping on all institution data. Always use the tenant manager mixin; never bypass it.
- **One `institution_memberships` table** with a `role` discriminator (teacher/student/admin). Do **not** create separate student/teacher tables.
- **Pooled credits:** member AI usage debits the institution's single credit account.
- **Access scope:** teachers → own batches only; institution_admin → own institution only; **never** cross-tenant.
- **White-label** via `institutions.branding` JSONB applied at the frontend.
- **Reuse the analytics engine** scoped by batch; do not fork analytics logic.
- Institution features are **post-MVP** (roadmap Months 5–6). Don't build ahead of the gate without sign-off.

## 10. Testing Rules

- **Mandatory tests** for: services (business logic), the **credit ledger** (reserve/commit/release + double-spend under concurrency), scoring, review **state-machine transitions**, **RBAC/tenant isolation** (cross-tenant access must be denied), and the **AI fallback chain** (with mocked providers).
- **Mock all external calls** (AI, Razorpay, Twilio, Telegram) — **no live calls in dev or CI**.
- Tooling: `pytest` + `pytest-django`, `factory_boy`. Cover critical paths; don't chase 100%.
- **Test the unhappy paths:** insufficient credits, provider failure → fallback, network drop mid-mock (idempotent save), unauthorized tenant access.
- Migrations must apply cleanly on a fresh DB in CI.
- **No merge with failing tests or failing migrations.**

## 11. Deployment Rules

- **Single VPS, Docker Compose.** Containers: `next`, `django`, `celery-worker`, `celery-beat`, `redis`, `postgres+pgvector`, `n8n`. No Kubernetes, no managed cloud for MVP.
- **Nginx + Let's Encrypt** TLS termination and edge rate limits.
- **CI/CD (GitHub Actions):** build → test → deploy over SSH/Compose; **migrations run as a gated release step**.
- **Local storage before cloud.** Don't add R2/S3 until the scale gate.
- **Telegram before WhatsApp.** WhatsApp (Twilio) only after Telegram works, and must respect template approval, opt-in, and the 24-hour session window.
- **Automated off-box backups** (DB via `pg_dump` + WAL, and `/uploads`) are **mandatory before go-live**; restores must be tested.
- Secrets injected at runtime, never committed. n8n workflows exported to VCS.
- **No new infrastructure without explicit human approval.**

---

## Definition of Done (every PR)

- [ ] Cites the **PRD v4 section** it implements.
- [ ] Includes **migrations** for any schema change; they apply cleanly and reverse.
- [ ] Business logic lives in **services**, not views or the frontend.
- [ ] AI calls go through **`ai_gateway`** with **reserve/commit** credits.
- [ ] **Tests** for critical paths; suite is green.
- [ ] **RBAC + tenant scoping** enforced and tested.
- [ ] No secrets, **no new services**, no client-side business logic.
- [ ] API schema/docs updated if endpoints changed.

## Escalate — do not guess

Stop and ask a human (or block the PR) when a task would:
- add infrastructure, a service, a datastore, or a dependency;
- touch **credits, payments, auth, tenant isolation, or content publishing**;
- conflict with the PRD (flag the conflict; don't silently diverge);
- require bypassing any Golden Rule.

## Hard "never" list

Never auto-publish AI content · never compute/trust credits or scores on the frontend · never call an AI provider outside `ai_gateway` · never hardcode an exam · never hand-edit the DB or skip migrations · never add microservices/Kubernetes/extra datastores · never store tokens in browser storage · never return cross-tenant data · never log secrets or keys · never use float for money.
