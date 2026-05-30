# Project Overview (agent context)

**Product:** PrepGenius AI — *Personalized Learning & Assessment Platform for Regional Competitive Exams.*
**Wedge:** Assamese-first depth on **Assam TET + Northeast TETs**, with **CTET Paper II (Science)** as low-cost top-of-funnel.
**Why this can win:** founder is regional + language-native with warm distribution and a bootstrap cost base; incumbents are broad but shallow regionally.

**Core loop:** Question → Explanation → Practice → Revision → Mastery.
**Monetization:** Free / Season Pass (one-time, exam-cycle) / Subscription (ranked exams) / Institution (pooled credits). CTET is a *qualifying* exam (pass once, lifetime validity) — subscription LTV comes from ranked exams + institutions, not CTET.

**Stack:** Next.js/TS/Tailwind/shadcn · Django/DRF · PostgreSQL+pgvector · Celery+Redis · self-hosted n8n · Razorpay · Telegram + Twilio WhatsApp · AI via Groq→OpenAI→DeepSeek (behind `ai_gateway`, metered by a credit ledger).

**Foundational invariants:** config-driven exam engine; append-only credit ledger; human-reviewed (draft-only) AI content; tenant-isolated institutions; DPDP compliance incl. minors flag.

See `docs/prd/prepgenius_prd_v4.md` and `docs/architecture/system_architecture.md` for detail.
_Last updated: 30 May 2026_
