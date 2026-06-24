# PrepGenius Operations Platform — UX Architecture

> **Status:** Design specification (no implementation). UX architecture, workflows, navigation, and operations experience only.
> **Purpose:** Define a modern internal Operations Platform that progressively replaces day-to-day Django Admin usage.
> **Aligns with:** `ui_design_document.md` (foundations), `design_system.md` (tokens), `security_architecture.md` (RBAC/tenant), PRD v4 (Content Ops, Institutions, Credits/AI Ops).
> **Non-goals:** This document writes no code, no APIs, no schema. Django Admin remains the fallback for long-tail models until the platform reaches parity.

---

## 0. Design Principles for the Ops Platform

1. **Admin is for editing rows; Ops is for getting work done.** Every workspace is organized around a *job to be done* (review this batch, top up these credits, publish this exam), not around database tables.
2. **Queues over lists.** Operators live in prioritized work queues with clear "what's mine / what's next" framing, not raw paginated tables.
3. **Server-authoritative everything.** The platform renders state the backend computed. No credit math, no scoring, no review-state transitions decided client-side (Golden Rules).
4. **Trust is the product.** Origin (`official` vs `ai-generated`), review state, and approval lineage are visible at every altitude. Nothing publishes without a human and an audit trail.
5. **Tenant isolation is structural, not cosmetic.** Cross-tenant data never appears; the UI cannot "reveal" what the API filtered out.
6. **Keep Django Admin reachable.** A "View in Django Admin" escape hatch exists on every record during the transition, so we never block ops on missing platform features.
7. **Boring, fast, deletable.** shadcn/Tailwind primitives, minimal custom components, no speculative dashboards.

---

## 1. User Personas

Seven primary personas. Each entry: who they are, their core job, what they live in daily, their top pains in Django Admin today, and their success metric.

### 1.1 Super Admin (Platform Owner / Ops Lead)
- **Who:** Founder/CTO-level. Full trust, full reach.
- **Core job:** Keep the platform healthy — users, roles, AI spend, billing, system config.
- **Lives in:** Overview Dashboard, AI Operations, Billing, Settings, Users.
- **Django Admin pain:** No single health view; switching between unrelated model pages; dangerous actions one misclick away with no guardrails.
- **Success metric:** Time-to-detect and time-to-resolve incidents; spend within budget; zero unauthorized access.

### 1.2 Content Manager
- **Who:** Owns the content pipeline end-to-end — uploads source material, structures it, triggers extraction/generation, ships approved content.
- **Core job:** Move content from *ingested* → *published* without quality regressions.
- **Lives in:** Content Studio, Review Queue (as router/assigner), Exams.
- **Django Admin pain:** Bulk operations are clumsy; no visibility into where each item sits in the pipeline; can't see dedup candidates; publish is a scary raw status field.
- **Success metric:** Throughput (items published/week), rejection rate, time-in-pipeline.

### 1.3 Reviewer
- **Who:** Editorial reviewer. First human gate on AI-extracted/generated content.
- **Core job:** Edit, approve, or reject draft content against quality and formatting standards.
- **Lives in:** Review Queue (their assigned queue), Content Studio (read context).
- **Django Admin pain:** No focused review surface; has to open content + source + metadata in separate tabs; no keyboard-driven approve/reject; no side-by-side diff.
- **Success metric:** Items reviewed/day, decision quality (low downstream SME reversal), turnaround time.

### 1.4 SME Reviewer (Subject Matter Expert)
- **Who:** Domain expert — verifies factual accuracy and syllabus alignment. Part-time, high-value, often external.
- **Core job:** Sign off on correctness, syllabus mapping, and difficulty calibration for items escalated to SME review.
- **Lives in:** SME Review workspace only (deliberately narrow surface).
- **Django Admin pain:** Over-exposed to the whole admin; intimidating; no syllabus context next to the question; can't easily flag "needs rework."
- **Success metric:** Accuracy sign-off throughput, post-publish error rate.

### 1.5 Operations Manager
- **Who:** Runs daily operations — monitors pipelines, ingestion jobs, Celery health, notification delivery, reminders.
- **Core job:** Keep the machine running; unblock stuck work; reassign load.
- **Lives in:** Overview Dashboard, AI Operations, Review Queue (oversight), Analytics.
- **Django Admin pain:** No operational telemetry in admin at all — they live in logs and Flower; no unified queue depth / SLA view.
- **Success metric:** Pipeline SLA adherence, queue backlog, failed-job recovery time.

### 1.6 Support Agent
- **Who:** Front-line user support. Resolves account, access, credit, and content-feedback issues.
- **Core job:** Find a user fast, understand their state, take a bounded set of safe actions, escalate the rest.
- **Lives in:** Users workspace, Billing (read + limited actions), Notification Center.
- **Django Admin pain:** Has too much power or too little; risky to give admin access; no "user 360" view; credit adjustments are raw ledger edits (dangerous and forbidden).
- **Success metric:** First-contact resolution, time-to-find-user, zero policy violations (never edits ledger directly; issues adjustments via approved actions).

### 1.7 Future Institute Admin (Post-MVP — Roadmap Months 5–6)
- **Who:** Admin of a partner institution (coaching center/school). **External**, tenant-scoped.
- **Core job:** Manage their own batches, members, pooled credits, branding, and batch analytics — and *nothing* outside their tenant.
- **Lives in:** A tenant-scoped subset: Users (their members), Analytics (their batches), Billing (their pooled account), Settings (their branding).
- **Pain to avoid:** Any leakage of platform-global data; ever seeing another institution.
- **Success metric:** Self-service rate (fewer support tickets), zero cross-tenant exposure.
- **Note:** Designed-for now, **gated** behind the institutions roadmap. The platform's RBAC + tenant model must accommodate this persona from day one without building its screens yet.

---

## 2. Information Architecture

### 2.1 Top-level structure

The platform is organized into **Workspaces** (top-level domains), each containing **Sections** (sub-areas), each containing **Screens** (list/detail/form surfaces).

```
PrepGenius Ops Platform
├── Overview            (cross-domain health & "my work")
├── Users               (people, roles, access, support 360)
├── Content Studio      (ingest → structure → generate → manage)
├── Review Queue        (editorial review workflow)
├── SME Review          (expert accuracy sign-off)
├── Exams               (exam config, syllabus, blueprints, papers)
├── CMS Studio          (public site pages, study guides, landing pages)
├── Analytics           (platform, content, learning, ops analytics)
├── AI Operations       (gateway health, credits, spend, fallback, cache)
├── Billing             (plans, invoices, credit accounts, payments)
└── Settings            (org, roles, exam config data, integrations, audit)
```

### 2.2 Conceptual model (entities operators reason about)

- **People:** Users, Roles, Memberships, Institutions (tenants).
- **Content objects:** Source documents, Questions (master + appearances), Explanations, Study materials — each carries `origin` and `review_state`.
- **Work items:** Review tasks, SME tasks, ingestion jobs, generation jobs — each carries owner, SLA, priority.
- **Commerce objects:** Credit accounts (user/institution), Credit transactions (append-only ledger — **read-only in UI**), Plans, Invoices, Payments.
- **System objects:** AI providers, Models, Cache entries, Celery queues, Audit log entries.

### 2.3 Cross-cutting concepts surfaced everywhere
- **Origin badge:** `Official` vs `AI-Generated` — always visible on content.
- **Review-state chip:** `draft → in_review → sme_review → approved → published` (+ `rejected`).
- **Tenant scope:** current institution context (global vs scoped) shown in the global header for any tenant-scoped data.
- **Audit lineage:** "who changed what, when" reachable from every record.

### 2.4 Content lifecycle (the spine of Content Studio / Review / SME)

```
[Source upload] → ingest (Celery) → [Extracted/Generated DRAFT]
   → dedup check (pgvector + pg_trgm) → reviewer-visible candidates
   → IN_REVIEW (Reviewer: edit / approve / reject)
        → (needs expert) → SME_REVIEW (SME: accuracy + syllabus)
        → APPROVED (Content Manager: publish gate)
   → PUBLISHED
   (reject at any gate → DRAFT with reason; every transition logged)
```

---

## 3. Navigation Structure

### 3.1 Global shell

A persistent three-zone shell:

```
┌───────────────────────────────────────────────────────────────────┐
│  TOP BAR: Logo · Tenant/Context switcher · Global Search (⌘K) ·     │
│           Notification bell · Help · User menu (role, theme, logout)│
├──────────┬────────────────────────────────────────────────────────┤
│          │                                                          │
│ PRIMARY  │   WORKSPACE CONTENT AREA                                 │
│ SIDEBAR  │   (page header → filters/toolbar → content → detail)     │
│ (rail)   │                                                          │
│          │                                                          │
├──────────┴────────────────────────────────────────────────────────┤
│  Optional status footer: env badge (prod/staging), queue health dot │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 Primary sidebar (collapsible rail)

- **Role-filtered:** Only workspaces the role can access render. A Support Agent never sees AI Operations; an SME sees essentially only SME Review.
- **Grouped:**
  - **Work:** Overview, Review Queue, SME Review
  - **Content:** Content Studio, Exams, CMS Studio
  - **People & Money:** Users, Billing
  - **Platform:** Analytics, AI Operations, Settings
- **Behavior:** Icon-only collapsed state (with tooltips) for dense work; expanded labels by default on ≥1024px. Active workspace highlighted (indigo). Badge counts on Review Queue / SME Review / Notifications show personal backlog.

### 3.3 Secondary navigation (in-workspace)

Each workspace uses **left sub-nav or top tabs** depending on breadth:
- **Tabs** for shallow workspaces (e.g., Exams: *Exams · Syllabus · Blueprints · Papers*).
- **Sub-nav list** for deep workspaces (Content Studio, Settings).

### 3.4 Contextual navigation
- **Breadcrumbs** on all detail screens: `Workspace / Section / Record`.
- **Detail drawers vs full pages:** Lightweight inspect → right-side drawer (keeps queue context). Heavy editing → full detail page.
- **Back-to-queue affordance:** Review/SME detail screens always keep "← Queue (N remaining)" so reviewers never lose their place.

### 3.5 Navigation rules
- Max depth: **Workspace → Section → Detail** (3 levels). Anything deeper becomes a drawer or tab, not a new route level.
- Deep-linkable: every screen, filtered view, and record has a stable URL for sharing in support/ops.
- Keyboard: `g` then workspace initial (e.g., `g r` → Review Queue) as a power-user jump; `⌘K` for everything else.

---

## 4. Workspace Design

Each workspace below: **purpose · primary personas · key screens · core actions · signals/widgets**.

### 4.1 Overview Dashboard
- **Purpose:** "What needs me, and is the platform healthy?" Cross-domain landing.
- **Personas:** All (role-personalized).
- **Key screens:** Personalized dashboard (see §6).
- **Core actions:** Jump into my queue, acknowledge alerts, view today's throughput.
- **Signals:** My open tasks, queue SLAs at risk, AI spend vs budget (Super Admin/Ops), failed jobs, new signups, revenue snapshot (Super Admin/Billing).

### 4.2 Users
- **Purpose:** People, access, and the **Support 360** view.
- **Personas:** Super Admin, Support Agent, (Institute Admin → own members).
- **Key screens:** Users list → **User 360 detail** (profile, plan, credit balance [read-only ledger], devices/sessions, content feedback, support history, consent/DPDP status); Roles & permissions; Institutions/tenants (Super Admin).
- **Core actions:** Search user, view 360, reset access / send password reset, suspend/reactivate, assign role (bounded), **issue credit adjustment via approved action** (never edit ledger), trigger DPDP export/anonymize (Super Admin, confirmed), impersonate read-only for support (audited, Super Admin-gated).
- **Signals:** Account status, risk flags, consent state, open tickets.

### 4.3 Content Studio
- **Purpose:** The content pipeline cockpit — ingest, structure, generate, and manage the question/explanation/material library.
- **Personas:** Content Manager (primary), Reviewer (read context), SME (read context).
- **Key screens:**
  - **Pipeline board** (kanban by state: Draft → In Review → SME → Approved → Published) — the default Content Studio view.
  - **Source documents** list + upload + ingestion status.
  - **Generation console** (exam-config-driven request → job status → resulting drafts). *Triggers async jobs only; never a synchronous AI call.*
  - **Question library** (master questions with appearance history across years).
  - **Item detail** (content, metadata, origin, dedup candidates, syllabus mapping, review history).
  - **Dedup inspector** (pgvector/pg_trgm candidate comparison — **surface, never auto-merge**).
- **Core actions:** Upload source, start extraction/generation (queued), assign to reviewer, edit draft, view dedup candidates and manually link/keep-separate, publish approved content (gated), bulk-route.
- **Signals:** Pipeline stage counts, items aging in stage, generation job progress, dedup-flagged count.

### 4.4 Review Queue
- **Purpose:** Focused editorial review surface.
- **Personas:** Reviewer (primary), Content Manager (router/oversight).
- **Key screens:** **My Queue** (assigned), **Team Queue** (manager), **Review workspace** (split view: content editor | source/context + metadata + syllabus | decision panel).
- **Core actions:** Approve, Reject (reason required), Request SME review, Edit-and-approve, Skip/return to pool, bulk approve (guarded). Keyboard-first: `a` approve, `r` reject, `s` send to SME, `j/k` next/prev.
- **Signals:** Queue depth, SLA timers per item, my throughput today, rejection reasons trend.

### 4.5 SME Review
- **Purpose:** Narrow, expert-only accuracy + syllabus sign-off.
- **Personas:** SME Reviewer.
- **Key screens:** **SME Queue**, **SME review workspace** (question + answer + rationale | syllabus node + learning objective | difficulty calibration | accuracy decision).
- **Core actions:** Verify-correct, Flag-inaccurate (return to draft with notes), Adjust syllabus mapping/difficulty (suggested, not direct publish), Approve accuracy.
- **Signals:** Items awaiting me, average sign-off time, my reversal rate.
- **Deliberate constraint:** SME sees only this workspace + read context. No users, no billing, no settings.

### 4.6 Exams
- **Purpose:** Exam configuration is *data that drives every engine* — manage it as config, never code.
- **Personas:** Content Manager, Super Admin, Ops Manager.
- **Key screens:** Exams list → **Exam config detail** (metadata, audience, `audience_is_minor`, locale defaults); **Syllabus tree** editor; **Blueprints** (topic/difficulty/objective distribution); **Papers** (past papers, appearance years); **Public landing mapping** (links to CMS Studio).
- **Core actions:** Create/edit exam config, edit syllabus tree, define blueprint distributions, attach papers, set minor-audience gating + parental-consent requirement.
- **Signals:** Config completeness, exams missing blueprints, minor-audience flags, content coverage vs blueprint.

### 4.7 CMS Studio
- **Purpose:** Public-facing content — website pages, study guides, exam landing pages (the existing CMS Foundation gets an ops surface).
- **Personas:** Content Manager.
- **Key screens:** Pages list (by type/category) → **Page editor** (RichText blocks, SEO/sitemap fields, locale variants); Study Guides; Exam Landing Pages; **Publish/preview** workflow.
- **Core actions:** Create/edit page, manage blocks, set SEO metadata, manage locale variants (Assamese default), preview, publish/schedule, manage sitemap inclusion.
- **Signals:** Draft vs published pages, missing-locale warnings, SEO completeness, broken internal links.

### 4.8 Analytics
- **Purpose:** Operational and product insight (reuse the analytics engine; never fork logic).
- **Personas:** Super Admin, Ops Manager, Content Manager; (Institute Admin → own batches).
- **Key screens:** **Platform** (signups, activation, retention, DAU/MAU), **Content** (pipeline throughput, rejection rates, coverage), **Learning** (aggregate readiness/mastery trends — privacy-safe, no minor profiling), **Ops** (queue SLAs, job success), **Cohort/funnel** views.
- **Core actions:** Filter by date/exam/cohort/tenant, export (where permitted), save view.
- **Signals:** Trend deltas, anomaly flags.

### 4.9 AI Operations
- **Purpose:** Run and watch the AI layer — the only place that surfaces `ai_gateway` internals.
- **Personas:** Super Admin, Ops Manager.
- **Key screens:** **Gateway health** (provider status: Groq → OpenAI → DeepSeek fallback chain, per-operation model config — **config, not hardcode**); **Spend & tokens** (cost per operation/user/day, margin); **Credit protocol monitor** (reserve/commit/release health, stuck reservations); **Cache** (hit rate, 0-credit hits, invalidation); **Rate-limit/budget** controls; **Job queues** (ai/ingest/analytics queue depth & failures).
- **Core actions:** Adjust model-per-operation config, set per-user/global budgets & rate limits, invalidate cache entries, retry/inspect failed jobs, pause a provider.
- **Signals:** Fallback frequency, error rate per provider, spend vs budget burn-down, stuck reservations (potential credit leak).

### 4.10 Billing
- **Purpose:** Plans, invoices, payments, and **credit accounts** (user + pooled institution).
- **Personas:** Super Admin, Support Agent (bounded), Billing/Ops; (Institute Admin → own pooled account).
- **Key screens:** Plans/products; **Credit accounts** (balance + append-only ledger view — read-only); **Transactions ledger** (immutable); Invoices; Payments (Razorpay reconciliation — read of verified webhooks); Adjustments/refunds workflow.
- **Core actions:** View ledger (never edit), **issue a credit adjustment via an approved, audited action** (which appends a transaction through backend services — UI never mutates balances directly), view/resend invoice, initiate refund (gated, confirmed). All credit-affecting actions go through backend services with `select_for_update`; the UI only requests them.
- **Signals:** Low-balance accounts, failed payments, refund queue, reconciliation mismatches.
- **Guardrail:** The ledger is **append-only and visually read-only**. There is no "edit transaction" affordance anywhere. Money fields display as exact decimals (never float).

### 4.11 Settings
- **Purpose:** Org and platform configuration, role management, exam-config reference data, integrations, audit.
- **Personas:** Super Admin (primary); (Institute Admin → own branding/members).
- **Key screens:** Organization profile; **Roles & permissions** (RBAC matrix editor); Reminder/notification types (config-driven); Credit rules (config); Integrations (Telegram first, WhatsApp/Twilio post-Telegram, Razorpay, n8n) — **status + config, secrets via env only, never shown**; **Audit log** (global, filterable); White-label/branding (tenant, JSONB → token swap); Feature flags / roadmap gates.
- **Core actions:** Edit roles, configure reminder/credit rules as data, manage integration connections (no secret display), browse audit, toggle gated features (Super Admin).
- **Signals:** Integration health, recent privileged actions, pending config changes.

---

## 5. Screen Inventory

Screen types: **L** = List/Queue, **D** = Detail, **F** = Form/Editor, **B** = Board, **W** = Workspace (split), **DSH** = Dashboard, **M** = Modal/Drawer.

| # | Workspace | Screen | Type | Primary persona |
|---|-----------|--------|------|-----------------|
| 1 | Overview | Role dashboard | DSH | All |
| 2 | Overview | Alerts & incidents | L | Super Admin, Ops |
| 3 | Users | Users list | L | Super Admin, Support |
| 4 | Users | User 360 detail | D | Support, Super Admin |
| 5 | Users | Roles & permissions | F | Super Admin |
| 6 | Users | Institutions/tenants list | L | Super Admin |
| 7 | Users | Institution detail | D | Super Admin |
| 8 | Users | Consent / DPDP panel | M | Super Admin, Support |
| 9 | Content Studio | Pipeline board | B | Content Manager |
| 10 | Content Studio | Source documents list | L | Content Manager |
| 11 | Content Studio | Upload source | F/M | Content Manager |
| 12 | Content Studio | Ingestion job status | D | Content Manager, Ops |
| 13 | Content Studio | Generation console | F/W | Content Manager |
| 14 | Content Studio | Question library | L | Content Manager |
| 15 | Content Studio | Item detail (question/material) | D | Content Manager, Reviewer |
| 16 | Content Studio | Dedup inspector | W/M | Content Manager, Reviewer |
| 17 | Review Queue | My queue | L | Reviewer |
| 18 | Review Queue | Team queue | L | Content Manager |
| 19 | Review Queue | Review workspace (split) | W | Reviewer |
| 20 | Review Queue | Reject reason / transition modal | M | Reviewer |
| 21 | SME Review | SME queue | L | SME |
| 22 | SME Review | SME review workspace | W | SME |
| 23 | Exams | Exams list | L | Content Manager |
| 24 | Exams | Exam config detail | D | Content Manager |
| 25 | Exams | Syllabus tree editor | F | Content Manager |
| 26 | Exams | Blueprint editor | F | Content Manager |
| 27 | Exams | Papers list/detail | L/D | Content Manager |
| 28 | CMS Studio | Pages list | L | Content Manager |
| 29 | CMS Studio | Page editor (blocks) | F | Content Manager |
| 30 | CMS Studio | Study guides list/editor | L/F | Content Manager |
| 31 | CMS Studio | Exam landing pages | L/F | Content Manager |
| 32 | CMS Studio | Preview & publish | M/D | Content Manager |
| 33 | Analytics | Platform analytics | DSH | Super Admin, Ops |
| 34 | Analytics | Content analytics | DSH | Content Manager |
| 35 | Analytics | Learning analytics | DSH | Super Admin |
| 36 | Analytics | Ops/SLA analytics | DSH | Ops |
| 37 | AI Operations | Gateway health | DSH | Super Admin, Ops |
| 38 | AI Operations | Spend & tokens | DSH | Super Admin |
| 39 | AI Operations | Credit protocol monitor | L/DSH | Ops |
| 40 | AI Operations | Cache management | L | Ops |
| 41 | AI Operations | Budgets & rate limits | F | Super Admin |
| 42 | AI Operations | Job queues & failures | L | Ops |
| 43 | Billing | Plans/products | L/F | Super Admin |
| 44 | Billing | Credit accounts | L | Super Admin, Support |
| 45 | Billing | Transactions ledger (read-only) | L | Super Admin, Support |
| 46 | Billing | Adjustment/refund workflow | F/M | Super Admin |
| 47 | Billing | Invoices | L/D | Super Admin, Support |
| 48 | Billing | Payments / reconciliation | L | Super Admin |
| 49 | Settings | Organization profile | F | Super Admin |
| 50 | Settings | Reminder/credit rules (config) | F | Super Admin |
| 51 | Settings | Integrations | L/F | Super Admin |
| 52 | Settings | Audit log | L | Super Admin |
| 53 | Settings | Branding/white-label | F | Super Admin, Institute Admin |
| 54 | Settings | Feature flags / roadmap gates | F | Super Admin |
| 55 | Global | Command palette | M | All |
| 56 | Global | Notification center | M/D | All |
| 57 | Global | Global search results | L | All |

≈57 screens; the high-value first slice is bolded by the implementation order in §16.

---

## 6. Dashboard Layouts

### 6.1 Layout grammar
12-column responsive grid. Top row = **decision-grade KPIs** (≤4 stat cards). Second row = **"my work" / action queues**. Third row = **trends/charts**. Right rail (≥1280px) = **alerts/activity feed**. Every widget states a number, a delta, and a one-click action.

### 6.2 Super Admin / Ops Overview
```
┌ KPI: Active users (Δ) ┬ KPI: AI spend vs budget ┬ KPI: Pipeline backlog ┬ KPI: Failed jobs ┐
├───────────────────────┴─────────────────────────┴───────────────────────┴──────────────────┤
│  Alerts & incidents (SLA at risk · stuck credit reservations · provider degraded)           │
├──────────────────────────────────────┬──────────────────────────────────────────────────────┤
│  Spend burn-down (chart)             │  Activity / audit feed (privileged actions, live)     │
├──────────────────────────────────────┼──────────────────────────────────────────────────────┤
│  Queue health (Review / SME / jobs)  │  Integration status (Telegram, Razorpay, n8n)         │
└──────────────────────────────────────┴──────────────────────────────────────────────────────┘
```

### 6.3 Content Manager Overview
```
┌ Items published (wk) ┬ In pipeline ┬ Rejection rate ┬ Avg time-in-stage ┐
├──────────────────────┴─────────────┴────────────────┴───────────────────┤
│  Pipeline board snapshot (counts per stage, aging items highlighted)    │
├──────────────────────────────────────┬──────────────────────────────────┤
│  Generation jobs in progress         │  Dedup candidates awaiting decision│
└──────────────────────────────────────┴──────────────────────────────────┘
```

### 6.4 Reviewer / SME Overview (queue-centric, minimal)
```
┌ My queue (N) ┬ Reviewed today ┬ SLA at risk (N) ┐
├──────────────┴────────────────┴─────────────────┤
│  ▶ Start reviewing (opens next item in workspace)│
│  My recent decisions · rejection-reason mix       │
└───────────────────────────────────────────────────┘
```

### 6.5 Support Agent Overview
```
┌ Open tickets ┬ Users flagged ┬ Failed payments ┐
├──────────────┴───────────────┴─────────────────┤
│  Quick find user (search-first)                 │
│  Recently viewed users · escalations queue       │
└──────────────────────────────────────────────────┘
```

**Personalization rule:** the dashboard is composed from role-permitted widgets only. No empty/locked tiles for data a role can't access.

---

## 7. Table Standards

A single, consistent data-table pattern across all list screens.

- **Anatomy:** Toolbar (search + filters + saved views + bulk actions + column toggle + export) → header (sortable, sticky) → rows → footer (cursor pagination + selected-count + density toggle).
- **Pagination:** **Cursor-based** (matches API standard), not page numbers. "Load more" / next-prev cursor controls.
- **Sorting & filtering:** Server-driven; multi-filter chips shown above the table; filters persist in the URL (shareable). **Saved views** per user (e.g., "My rejected items this week").
- **Row anatomy:** Primary identifier (linked), key status chips (review-state, origin), 2–4 scannable columns, right-aligned actions (overflow menu for the long tail).
- **Selection & bulk:** Checkbox column; sticky bulk-action bar appears on selection; destructive/irreversible bulk actions require typed confirmation and show exact count.
- **Density:** Comfortable (default) / Compact toggle for power users in queues.
- **States:** Loading (skeleton rows), empty (purposeful empty state with primary CTA), error (inline retry), partial (filtered count vs total).
- **Status semantics (colorblind-safe):** state = color **+ icon + label**, never color alone (reuses the design-system question-state principle).
- **Money columns:** monospaced, right-aligned, exact decimals, currency-tagged. Ledger tables are explicitly read-only (no inline edit, no row delete).
- **Performance:** virtualize long queues; default reasonable page size; never block render on counts (lazy total).
- **Escape hatch:** row overflow → "View in Django Admin" during transition.

---

## 8. Form Standards

- **Layout:** Single-column by default (best for scanning/accessibility); two-column only for short paired fields. Section headers group related fields. Sticky action bar (Save / Cancel) at bottom on long forms.
- **Validation:** Server-authoritative validation is the source of truth (mirrors API serializers); client does only lightweight format hints. Errors inline at the field + a summary at top; never silent.
- **Field patterns:** Labels above inputs; helper text for non-obvious fields; required marked clearly; sensible defaults from config (no hardcoded exam logic — config-driven choices).
- **Dangerous/irreversible actions:** Confirmation with explicit consequence text; typed confirmation for destructive ones (publish, refund, anonymize, role change, provider pause). Reuse the §"never destructive without confirmation" rule.
- **Save semantics:** Optimistic only where safe; for credits/publishing/roles, **pessimistic** — wait for server confirmation, show pending state, surface conflicts.
- **Drafts & autosave:** Long editors (CMS page, exam config) autosave drafts; show SaveStatus indicator (reuse component). Never autosave a *publish*.
- **Multi-step (wizards):** For generation requests, exam setup, institution onboarding — stepper with review-before-submit; each step independently valid; async submission shows job hand-off, not a fake "done."
- **Localization:** Forms editing public content expose locale variants (Assamese default); missing-locale warnings; RTL-safe layout primitives even if not needed yet.
- **Permissions in forms:** Fields a role can't edit render read-only (not hidden) where context matters, hidden where they'd confuse — decided per field, server-enforced regardless.

---

## 9. Search & Command Palette Design

### 9.1 Global Search (top bar)
- **Scope:** Cross-entity — users, content items, exams, pages, invoices, institutions — **role- and tenant-scoped** (results never leak across permissions/tenants).
- **Behavior:** Type-ahead grouped by entity type; recent + suggested; each result shows entity badge + key status; Enter opens, ⌘-Enter opens in new context.
- **Backed by server search**, debounced; never client-only filtering of a full dataset.

### 9.2 Command Palette (⌘K / Ctrl-K)
- **Purpose:** Power-user action + navigation surface.
- **Modes:**
  - **Navigate:** "Go to Review Queue", "Open user …"
  - **Act:** context-aware verbs — "Approve item", "Assign to reviewer", "Issue credit adjustment", "Invalidate cache", "Publish page" — only commands the role is permitted to run appear.
  - **Find:** falls through to global search.
- **Design:** Fuzzy match; grouped (Navigation / Actions / Search results); keyboard-only operable; shows shortcut hints; **destructive actions still route through their confirmation flow** (no silent execution from the palette).
- **Safety:** No credit/score mutation happens "in" the palette — it launches the proper confirmed action; backend enforces.

### 9.3 In-workspace search
Each list has its own scoped search (faster, filter-aware) distinct from global search.

---

## 10. Notification Center Design

- **Entry point:** Bell in top bar with unread badge; opens a right-side drawer; full-page "All notifications" for history.
- **Categories:** **Assignments** (item routed to you, SME requested), **SLA/escalations** (queue aging, stuck reservation), **System** (job failed, provider degraded, integration down), **Commerce** (failed payment, low balance, refund needed), **Mentions/handoffs** (reviewer ↔ SME notes).
- **Per-notification anatomy:** icon + severity color, source entity (linked), concise action verb, timestamp, primary CTA ("Open item"), state (unread/read/acknowledged).
- **Behavior:** Mark read/unread, acknowledge (for incidents), snooze, mute a category; deep-link straight to the work item. Real-time where it matters (queue assignments, incidents), digestable elsewhere.
- **Routing rules:** Role-targeted — Reviewers get assignments, Ops/Super Admin get system+SLA+spend, Support gets commerce/account. No noise: a persona only sees its relevant streams.
- **Relationship to external channels:** This is the *internal* operator center; it is distinct from learner-facing Telegram/WhatsApp messaging (which is config-driven and lives in notifications domain). Internal alerts may optionally fan out to email/Telegram for on-call but the platform center is the system of record.
- **No PII leakage / no secrets** in notification bodies (logging & privacy rules).

---

## 11. Mobile & Tablet Strategy

- **Stance:** **Desktop-first for operations** (review, content, billing are dense, multi-pane jobs) — but **tablet-capable and mobile-aware** for monitoring and light approvals, on low-end Android too.
- **Breakpoints:** Reuse design system (360 → 640 → 768 → 1024 → 1280).
- **Mobile (360–640):** *Monitor & act-light.* Overview dashboard, notifications, approve/reject from a simplified review card, user lookup, on-call alerts. Heavy editors (blueprint, CMS blocks, ledger, generation console) are intentionally **not** offered on phone — show a "best on larger screen" gate with read-only summary.
- **Tablet (768–1024):** *Reduced workspace.* Single-pane review (content → swipe to context → decision), pipeline board as horizontally scrollable lanes, dashboards full. Split-pane collapses to stacked.
- **Desktop (≥1024):** Full split workspaces, multi-pane review, command palette, dense tables.
- **Interaction:** Sidebar collapses to bottom nav / hamburger on mobile; tables become stacked cards on narrow widths; touch targets ≥44px; keyboard shortcuts desktop-only (don't crowd mobile).
- **Performance:** Lazy-load heavy workspaces; keep monitoring paths lean (matches "lean bundles for low-end Android").

---

## 12. Accessibility Requirements

- **Target:** WCAG 2.1 AA across the platform (operators use this all day — accessibility is productivity).
- **Color & state:** Never color-only. Every status uses **color + icon + text** (colorblind-safe, reusing the question-state system principle). 4.5:1 text contrast, 3:1 UI/large-text.
- **Keyboard:** Full keyboard operability — every action reachable without a mouse; review/SME queues are keyboard-first (`j/k/a/r/s`); visible focus rings; logical tab order; no keyboard traps; ⌘K palette as a keyboard backbone.
- **Screen readers:** Semantic landmarks (nav/main/complementary), labeled controls, table headers associated with cells, live regions for async results (job done, save status, validation), descriptive button text (no "click here").
- **Motion:** Respect `prefers-reduced-motion`; keep transitions 150–200ms; no essential info conveyed by motion alone.
- **Forms:** Programmatic label association, error text linked to fields, instructions not placeholder-only.
- **Localization & text:** Inter + Noto Sans Devanagari/Bengali; layouts tolerate longer translated strings; never bake text into images.
- **Targets & zoom:** ≥44px touch targets; usable at 200% zoom and reflow at 400%.
- **Don'ts:** No auto-advancing carousels in ops, no flashing, no time-limited actions without extension (server-authoritative timers display only).

---

## 13. Design System Requirements

- **Foundation:** Extend the existing PrepGenius design system (shadcn/ui + Tailwind). Do **not** fork a separate ops design language — share tokens so white-label is still a token swap.
- **Tokens:** Indigo primary, emerald success, amber warning, rose destructive; 4px spacing base; 10px radius; minimal elevation; 150–200ms motion. Add **ops-semantic tokens** on top: review-state palette (draft/in-review/sme/approved/published/rejected), origin (official/ai-generated), severity (info/warning/critical), queue-SLA (ok/at-risk/breached) — each defined as color **+ paired icon** for colorblind safety.
- **Typography:** Inter (Latin) + Noto Sans Devanagari (Hindi) + Noto Sans Bengali (Assamese); a monospaced face for IDs, money, tokens/cost, and ledger.
- **Density modes:** Comfortable vs Compact, since operators want dense tables and reviewers want focus.
- **Theming:** Light/dark; per-tenant branding via `branding` JSONB applied as token overrides at the frontend (Institute Admin scope).
- **Documentation:** Component states (default/hover/focus/disabled/loading/error/empty) specified for each; usage do/don't; accessibility notes per component.
- **Consistency rule:** Reuse existing custom components where applicable; introduce a new component only when a second real use exists (no speculative components — §1 of the rules).

---

## 14. Component Inventory

**Reused from existing design system:** SaveStatus, CreditMeter (read-only context), StateLegend, and base shadcn primitives (Button, Input, Select, Dialog, Tabs, Toast, Tooltip, Sheet/Drawer, Command).

**New ops components (build as the workspaces that need them land):**

| Component | Purpose | Used in |
|-----------|---------|---------|
| AppShell (TopBar + Sidebar rail) | Global navigation shell | All |
| WorkspaceHeader | Title, breadcrumbs, context, primary actions | All |
| DataTable | Standard table (§7) — sort/filter/bulk/cursor | All lists |
| FilterBar + SavedViews | Persistent, URL-synced filters | All lists |
| KanbanBoard / PipelineLane | Content lifecycle board | Content Studio |
| ReviewWorkspace (SplitPane) | Content | context | decision layout | Review, SME |
| DecisionPanel | Approve/Reject/Send-to-SME with reason capture | Review, SME |
| ReviewStateChip | Lifecycle state (color+icon+label) | Everywhere content appears |
| OriginBadge | Official vs AI-Generated | Content surfaces |
| DedupCompare | Side-by-side candidate comparison | Dedup inspector |
| User360Panel | Aggregated support view | Users |
| LedgerTable | Append-only, read-only money rows | Billing |
| CreditAdjustmentForm | Requests a backend adjustment (no client math) | Billing |
| KpiStatCard | Number + delta + action | Dashboards |
| AlertFeed / IncidentCard | SLA & system alerts with acknowledge | Overview, AI Ops |
| SpendChart / BudgetBurndown | AI spend vs budget | AI Ops, Billing |
| QueueDepthWidget | Review/SME/job backlog + SLA | Overview, Ops |
| ProviderStatus | Fallback-chain health (Groq→OpenAI→DeepSeek) | AI Ops |
| JobStatus / JobRetry | Celery job progress, retry/inspect | Content Studio, AI Ops |
| SyllabusTreeEditor | Hierarchical syllabus editing | Exams |
| BlueprintEditor | Topic/difficulty/objective distribution | Exams |
| BlockEditor | CMS RichText block composition | CMS Studio |
| LocaleVariantSwitcher | Manage multilingual content | CMS Studio |
| CommandPalette | ⌘K navigate/act/find | Global |
| NotificationDrawer | Internal notification center | Global |
| ConfirmDestructive | Typed-confirmation dialog | Anywhere irreversible |
| RolePermissionMatrix | RBAC editing grid | Settings |
| AuditLogViewer | Filterable activity history | Settings, records |
| TenantContextSwitcher | Global vs institution scope | Global (gated) |
| DjangoAdminLink | Transitional escape hatch | All records |

---

## 15. Role-Based Access Model

### 15.1 Principles
- **Server-enforced, always.** The UI hides/disables for clarity, but every read and write is authorized server-side; hiding is never the security boundary (§Security rules).
- **Tenant isolation is orthogonal to role.** A role grants *capabilities*; the tenant scope bounds *which rows*. Institute Admin = (admin-ish capabilities) ∩ (own institution only).
- **Least privilege & narrow surfaces.** SME and Support see deliberately small slices.
- **Sensitive domains gated harder:** credits, payments, auth, tenant isolation, content publishing require explicit, audited, confirmed actions.

### 15.2 Capability matrix (illustrative, server is source of truth)

Legend: ✅ full · 🔵 scoped/limited · 👁 read-only · — none

| Workspace / Capability | Super Admin | Content Mgr | Reviewer | SME | Ops Mgr | Support | Institute Admin* |
|---|---|---|---|---|---|---|---|
| Overview dashboard | ✅ | ✅ | 🔵 | 🔵 | ✅ | 🔵 | 🔵 (tenant) |
| Users — view/360 | ✅ | — | — | — | 👁 | 🔵 | 🔵 (own members) |
| Users — roles/access | ✅ | — | — | — | — | 🔵(reset) | 🔵 (own members) |
| Content Studio | ✅ | ✅ | 👁 | 👁 | 👁 | — | — |
| Generate/ingest (queue jobs) | ✅ | ✅ | — | — | 🔵(retry) | — | — |
| Publish content | ✅ | ✅(gate) | — | — | — | — | — |
| Review Queue — decide | ✅ | 🔵(route) | ✅ | — | 👁 | — | — |
| SME Review — sign off | ✅ | — | — | ✅ | 👁 | — | — |
| Exams config | ✅ | ✅ | — | 🔵(suggest) | 👁 | — | — |
| CMS Studio | ✅ | ✅ | — | — | — | — | 🔵(branding) |
| Analytics | ✅ | 🔵(content) | — | — | ✅ | 🔵 | 🔵 (own batches) |
| AI Operations | ✅ | — | — | — | ✅ | — | — |
| Billing — view ledger | ✅ | — | — | — | 👁 | 👁 | 🔵 (own pool) |
| Billing — adjust/refund | ✅ | — | — | — | — | 🔵(request) | — |
| Settings — roles/integrations | ✅ | — | — | — | 🔵(ops cfg) | — | 🔵(own branding) |
| Audit log | ✅ | 👁(own) | 👁(own) | 👁(own) | ✅ | 👁(own) | 🔵(own tenant) |
| Impersonate (read-only, audited) | ✅ | — | — | — | — | 🔵(gated) | — |

\* Institute Admin is **post-MVP, gated**; included so the model accommodates it now. Every Institute Admin cell is additionally tenant-scoped.

### 15.3 Action-level guardrails
- **Append-only ledger:** no role gets "edit/delete transaction." Adjustments are *new* transactions via backend services (`select_for_update`).
- **Publishing & AI content:** AI-generated content cannot bypass review; "publish" is unavailable until state = approved.
- **DPDP actions** (export/anonymize): Super Admin only, confirmed, audited; anonymize de-links financial/audit rows (never hard-delete ledger).
- **Provider keys / secrets:** never displayed to any role; integrations show status only.
- **All privileged actions audited:** who/what/when, surfaced in Settings → Audit log.

---

## 16. Recommended Implementation Order

Sequenced to (a) deliver the highest-pain replacements first, (b) respect roadmap gates (institutions post-MVP), and (c) keep Django Admin as fallback until parity. **Order, not estimates.**

### Phase 0 — Platform shell & primitives (foundation)
AppShell (TopBar + role-filtered Sidebar), auth/role gating wiring, WorkspaceHeader, **DataTable + FilterBar + SavedViews**, ConfirmDestructive, command palette skeleton, notification drawer skeleton, ops-semantic tokens (review-state/origin/severity). DjangoAdminLink escape hatch everywhere. → *Nothing user-facing replaced yet, but everything after is fast.*

### Phase 1 — Content trust pipeline (highest product value)
Content Studio **Pipeline board** + Item detail + OriginBadge/ReviewStateChip → **Review Queue** (My/Team + Review workspace + DecisionPanel, keyboard-first) → **SME Review** workspace. Server-enforced state machine surfaced; every transition logged. → *Replaces the most painful Django Admin workflow and protects the "content trust is the product" rule.*

### Phase 2 — Source & generation ops
Source documents + Upload + Ingestion JobStatus → Generation console (queued, exam-config-driven) → Dedup inspector (surface candidates, never auto-merge) → Question library (master + appearance history). → *Completes the ingest→draft half of the pipeline.*

### Phase 3 — Overview & monitoring
Role dashboards (Content Manager, Reviewer/SME, then Super Admin/Ops) → Alerts/Incident feed → Queue depth + SLA widgets → Notification Center routing live. → *Gives operators situational awareness over the now-digital pipeline.*

### Phase 4 — Exams & CMS Studio
Exam config detail + Syllabus tree + Blueprint editor + Papers → CMS Studio pages/study guides/landing pages with locale variants + preview/publish. → *Moves config-as-data and public content off raw admin.*

### Phase 5 — AI Operations
Gateway health + Provider fallback status → Spend & tokens + Budget burndown → Credit-protocol monitor (stuck reservations) → Cache management → Budgets/rate limits → Job queues. → *Cost & reliability control; depends on real pipeline traffic existing (Phases 1–2).*

### Phase 6 — Users & Support 360
Users list → **User 360** → roles/permissions matrix → consent/DPDP panel → impersonate (gated). → *Replaces ad-hoc admin user editing with safe, bounded support.*

### Phase 7 — Billing
Plans → Credit accounts + **read-only LedgerTable** → CreditAdjustmentForm (backend-routed) → Invoices → Payments/reconciliation → Adjustment/refund workflow. → *Most safety-critical; intentionally late, behind mature guardrails and audit.*

### Phase 8 — Settings, Analytics depth, Audit
Roles/integrations/config-as-data (reminder/credit rules) → Audit log viewer → Analytics workspaces (platform/content/learning/ops) maturation. → *Rounds out self-service config.*

### Phase 9 (gated, post-MVP) — Institutions / Institute Admin
Tenant context switcher → Institution detail → tenant-scoped Users/Analytics/Billing/Branding. **Do not build before the institutions roadmap gate and sign-off.** The RBAC + tenant model from Phase 0/6 already accommodates it.

### Decommissioning Django Admin
For each workspace, Django Admin stays as fallback until the platform reaches **functional parity + audit parity** for that domain. Retire admin access domain-by-domain (content first, billing last), never globally in one cut. Long-tail/rare models may remain in Django Admin indefinitely — that's an acceptable MVP outcome.

---

## Appendix A — Mapping to PRD & Rules

- **Content trust / review state machine / origin / dedup-no-auto-merge** → Content Management Rules §8; surfaced in Content Studio, Review, SME.
- **Credits append-only, reserve/commit/release, no client math** → DB Rules §5, AI Rules §7; Billing + AI Ops are read-of-ledger + backend-routed actions only.
- **AI gateway sole provider, config-driven fallback** → AI Rules §7; AI Operations workspace.
- **Tenant isolation + shared-schema** → DB §5, Institution §9; RBAC §15 + tenant context, Institute Admin gated.
- **Django Admin preferred for internal tooling (transition)** → Golden Rules; DjangoAdminLink + domain-by-domain decommission.
- **Assamese default, i18n** → Frontend Rules §4; CMS locale variants, design-system fonts.
- **No client-side business logic / server-authoritative** → Golden Rules; reflected in Form/Table/Palette standards.

## Appendix B — Open Questions to Resolve Before Build

1. **SME externality:** Are SMEs external contractors needing isolated auth/SSO and stricter data minimization? (Affects Users + access model.)
2. **Impersonation policy:** Is read-only impersonation acceptable under DPDP/consent, and what audit/notice is required?
3. **Notification fan-out:** Which incidents page on-call externally (email/Telegram) vs stay in-platform?
4. **Analytics privacy for minors:** Confirm aggregate-only, no-profiling constraints for minor-audience exams in Learning analytics.
5. **Parity bar for decommissioning:** Define the explicit checklist (feature + audit) that lets us retire each Django Admin domain.
```
