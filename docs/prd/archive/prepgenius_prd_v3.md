# Product Requirements Document (PRD) — v3

**Product (working title):** PrepGenius AI
**Positioning:** *Personalized Learning & Assessment Platform for Regional Competitive Exams*
**Document owner:** [Founder]
**Status:** Strategy-locked draft (beachhead direction committed)
**Last updated:** 30 May 2026

> **What changed from v2 → v3.** v2 reframed the business around two hard facts (CTET is a *qualifying* pass-once exam with lifetime validity; the market is dominated by free crore-scale incumbents). v3 commits to the **regional beachhead** direction, adds the **founder advantage** and **durable moat** that justify why *this* founder can win, expands the **institution line**, adds the **learning-science** and **personalization** engine that turns this from "another mock-test app" into a learning platform, and replaces the feature roadmap with a **business roadmap gated by validation milestones and explicit pivot criteria.**
>
> **Repositioning (per strategy review):** CTET is treated as an **acquisition channel, not the business**. The business is personalization + analytics + coaching centres + proprietary educational intelligence + regional dominance.

---

## 1. Strategy: the wedge (committed)

A new, unfunded entrant cannot beat pan-India incumbents who give the core product away free. So the strategy is **win an underserved beachhead, dominate it, then expand by LTV — not by feature list.**

**Committed direction:** **Assamese-first**, deep and higher-quality on **Assam TET + Northeast state TETs**, with **CTET Paper II (Science)** as the broad low-cost top-of-funnel. Earn trust in a niche the giants treat as an afterthought, then expand into ranked exams and the institution channel where recurring revenue is real.

---

## 2. Founder Advantage *(why THIS founder can win)*

Large competitors are generic, English/Hindi-centric, and optimize for scale, not depth. This founder has a stack of advantages they structurally cannot replicate cheaply:

- **Regional insider.** From Assam; understands the regional education ecosystem, the exams, and what aspirants actually struggle with — not a market researched from Bangalore or Noida.
- **Language-native.** Understands Assamese-speaking users — tone, idiom, and the lived gap that English/Hindi-first apps leave open. The incumbents *translate*; this product can be *native*.
- **Warm distribution.** Already has access to pilot CTET/TET candidates — solving the single hardest problem for a new product (first users) on day zero.
- **Automation depth.** Strong workflow-automation experience (n8n, Workfront, integrations) → can automate content ingestion and operations that would cost competitors headcount.
- **Operational leverage.** Can automate content and ops workflows, keeping the team tiny and margins high.
- **Bootstrap infrastructure.** Already owns a VPS and runs self-hosted n8n → near-zero marginal infra cost; can validate without burning capital or raising.

**Why this is an unfair advantage:** the incumbents win on breadth and capital. This founder wins on **depth, language, trust, warm distribution, and a cost base low enough to be profitable at a scale that's invisible to them.** A crore-scale player will not bother to out-localize a few lakh Assam TET aspirants; a founder from Assam can own them.

---

## 3. Product Vision

Help a regional aspirant go from *"I don't know my weak topics"* to *"I cleared the exam"* as efficiently as possible — through native-language practice, an adaptive personal learning engine, AI explanations in their language, analytics that map to the pass line, and habit automation. CTET acquires; the platform retains and expands.

---

## 4. Competitive Moat *(durable, compounding)*

Differentiation is not a moat; these are. Each one compounds and is hard to copy:

### 4.1 Regional language depth
An **Assamese-first** experience (UI, explanations, AI tutor, support), not a bolt-on translation. The deeper the regional fit, the less a generic giant can follow without rebuilding for a small market.

### 4.2 Weak-topic intelligence (not just analytics)
Most apps show dashboards. This system *acts*: identifies **weak topics, weak concepts, repeated mistake patterns**, and provides **suggested remediation** — closing the loop from "you're weak here" to "here's exactly what to do."

### 4.3 Personal AI mentor
The student should feel **"the platform knows me."** Personalization that remembers history, adapts, and mentors — the emotional moat that drives referral.

### 4.4 Proprietary question intelligence (data moat)
Store, per question and topic: **question history, appearance frequency, topic frequency, success rates, difficulty patterns.** Over time this becomes a dataset of *what actually matters and what students actually get wrong* that competitors cannot easily replicate — see §16, Data Asset Strategy.

---

## 5. Business Goals & Revenue Model

### Phased goals
- **Phase 0 — Validate:** 10–15 aspirants complete a full prep cycle; prove the core loop.
- **Phase 1 — Beachhead:** Become the clear best Assam/NE TET tool; 100 active, 10 paying.
- **Phase 2 — Durable revenue:** Institution line + ranked exams to break the qualifying-exam LTV ceiling.

### Revenue model
| Plan | Shape | Indicative price | Rationale |
|---|---|---|---|
| **Free** | 2 mocks/day + previous-year papers | ₹0 | Acquisition; matches market expectation |
| **Season Pass ("Crack It")** | One-time, valid to exam date: unlimited practice, AI mentor, weak-topic remediation, daily plan | ₹499–₹999 / season | Price aligned to a pass-once exam |
| **Subscription** | Monthly — **ranked/repeat exams only** (SSC/Banking/Railway) | ₹199–₹299 / mo | Recurring revenue where repeat use is genuine |
| **Institution** | Coaching centres (see §5.1) | Per-student / per-batch / annual | Buyer that does **not** churn on student success |

### 5.1 Institution Product Line *(expanded — likely the strongest LTV line)*
**Teacher Dashboard:** student performance, weak students surfaced, attendance, practice completion.
**Batch Analytics:** topic-level performance, class-level trends, cohort comparison.
**Custom Mock Tests:** teacher creates and assigns mocks to a batch.
**White-Label:** coaching-centre branding on the student experience.
**Revenue:** per student / per batch / annual license.

**Why institutions beat individual students on retention & LTV:** an individual CTET user passes once and leaves (LTV capped by the exam's nature). A coaching centre has a **new batch every cycle** — the relationship renews even as students churn. The buyer keeps paying precisely *because* students succeed and leave. Institutions convert one churning consumer into a recurring B2B account, and bring their whole batch as distribution.

---

## 6. Success Metrics

### 6.1 North Star Metric
**Weekly Active Learners Completing Practice Sessions.** Captures the one behaviour that predicts everything else — engaged, repeat practice.

**Supporting metrics:** practice sessions completed, mock tests completed, weak-topic practice completed, referral rate.

### 6.2 Reality-checked targets (pilot)
| Metric | Pilot target | Note |
|---|---|---|
| Pilot completion | 8 of 15 | Validates the loop |
| WAU (active prep window) | 40–50% | Realistic for finite-horizon exam |
| Daily practice completion | 30% | 50% is a stretch goal |
| Free → paid | 3–6% | Industry-typical; 50% is not a forecast |
| "It found my weak spots / I felt ready" | ≥70% | Predicts referral |
| Referral rate | track from day 1 | Only affordable growth lever |

---

## 7. Users & Personas

- **Primary — Regional TET aspirant:** Assamese/regional-language, tier-2/3, mobile-first (low-end Android), price-sensitive, patchy connectivity. Needs native-language practice, weak-topic clarity, accountability.
- **Secondary — CTET Paper II (Science) candidate:** broad top-of-funnel.
- **Buyer — Coaching-centre owner/teacher:** wants batch visibility and content-prep savings; doesn't churn on student success.
- **Future payer — Parent (see §10.x):** often a stronger payer than the student.

> **First-15 plan:** name the exact Assam/NE TET Telegram groups, communities, and coaching contacts you'll recruit from. You already have warm access — use it.

---

## 8. Learning Methodology *(educational defensibility)*

The platform is built on established learning science, not just test delivery:
- **Active recall** — learning through repeated testing, not passive reading.
- **Spaced repetition** — mistakes resurface on a spacing schedule until retained.
- **Error-based learning** — weak areas get disproportionately more practice.
- **Adaptive learning** — difficulty adjusts to the learner over time.

This is a moat incumbents' mock-test catalogues don't have: the *method* is the product.

---

## 9. Personal Learning Engine *(the core loop)*

The AI tutor in v2 was reactive. v3 makes it the spine of the product. The engine should:
- Detect weak concepts (not just weak topics).
- Predict likely future weak areas before the student hits them.
- Recommend daily practice, a revision schedule, and mock-test frequency.

**Shift the core loop from:**
`Question → Explanation`
**to:**
`Question → Explanation → Practice → Revision → Mastery`

This loop — powered by §8 methodology and §4.2 weak-topic intelligence — is what makes a student feel the platform *knows them*.

---

## 10. Product Modules

*(Intent retained from prior versions where sound; key changes noted.)*

1. **Auth & Profile** — incl. target exam, exam date, preferred language (Assamese/Hindi/English); DPDP consent + deletion (§17).
2. **Dashboard** — goal, streak, accuracy, weak topics, recommendations, **days-to-exam countdown**.
3. **Question Bank** — full attributes + `appeared_in[]`, `review_status`, `origin`, `verified_by`, **performance/difficulty/success-rate fields (feeds §16 data asset)**.
4. **Admin Ingestion** — assistive pipeline; **manual-entry fallback ships first**; pgvector dedupe; mandatory human review (see §11).
5. **Exam Engine** — topic/subject/mixed/previous-year/full mock (150Q/150min); timer, navigator, mark-for-review, auto-submit, full-screen; mobile + low-bandwidth tolerant; offline-resilient submission.
6. **Result Analytics** — score, accuracy, subject/topic/time analytics, 7/30/90-day trend; **framed against the per-section pass line**.
7. **Personal Learning Engine (was AI Tutor)** — §9; explanations in Assamese/English; per-user rate limits + token budget (§15).
8. **AI Question Generator** — **draft-only, human-reviewed, never auto-published**, visually distinct from official questions.
9. **Personalized Daily Practice** — 10–20 Q/day from weak topics + mistakes (Celery jobs).
10. **Study Plan Generator** — exam date + hours/day → dated plan anchored to countdown.
    - **10.x Parent Dashboard (FUTURE — not MVP):** child performance, weekly report, weak topics, improvement trends, study recommendations. Parents are often stronger payers than students — a future revenue stream, not a pilot feature.
11. **Engagement Automation** — n8n; **Telegram + Email (now), WhatsApp via Twilio (see §15)**; reminders frequency-capped and opt-in.
12. **Leaderboard (V2)** — sequence with *ranked* exams, where rank actually matters.
13. **Admin Portal** — manage users/content/exams; **AI-content review queue**; analytics.

---

## 11. Content Operations *(largest business risk — own it)*

Educational trust depends entirely on content quality. The pipeline:

`Upload PDF → AI Extraction → Duplicate Detection → Human Review → Publish → Periodic Audit`

**Quality standards:**
- Every published question carries `review_status` + `verified_by`.
- AI-extracted **and** AI-generated content is **draft-only** until a human approves it.
- Official questions are visually distinguished from AI-generated practice.
- Scheduled spot-audits of published explanations.
- A single wrong "official" question is treated as a sev-1 trust incident.

---

## 12. MVP Scope (realistic, sequenced)

**Pilot build (~6–8 weeks):** auth + profile · manual question entry + bank · exam engine (papers/topic/subject/full mock) · result analytics · personal learning engine (explanations) with rate limits · Telegram reminders · admin review/publish.
**Fast-follow:** AI ingestion (assistive) + pgvector dedupe · AI generator (draft-only) · daily practice + study plan · Razorpay paywall + Season Pass · WhatsApp via Twilio.
**Out of scope for MVP:** mobile app, leaderboards, CTET subscription, advanced coaching, multi-exam, voice tutor, full RAG, cloud storage, parent dashboard.

---

## 13. Founder Execution Roadmap *(business roadmap, not feature roadmap)*

Business validation gates feature expansion at every step.

| Month | Focus |
|---|---|
| **1** | Question bank · mock tests · analytics |
| **2** | Personal learning engine (AI tutor) · Telegram bot |
| **3** | 100 users · Season Pass live (Razorpay) |
| **4** | Assam TET expansion |
| **5** | Institution dashboard |
| **6** | Institution sales |

---

## 14. Validation Gates *(prevent overbuilding)*

- **Gate 1 — 15 pilot users:** measure practice completion, qualitative feedback, retention. *No new modules until passed.*
- **Gate 2 — 100 users:** measure DAU, WAU, conversion.
- **Gate 3 — 10 paying users:** required **before** expanding development.
- **Gate 4 — 50 paying users:** required **before** adding additional exams.

---

## 15. Exit / Pivot Criteria *(decide before you're emotionally attached)*

Pivot or stop if, after a fair test:
- Retention < 20% after the pilot.
- Fewer than 5 paying users at 100 active users.
- No demonstrated institution demand.

These are set *now* so the decision is data-driven later, not emotional.

---

## 16. Growth: Community & Referral

### 16.1 Community Layer
A **Telegram community** as a retention engine technology alone can't match: daily questions, weekly challenges, exam discussions, live doubt-solving. This is also where your warm audience already lives — meet them there first.

### 16.2 Referral System (future)
Students invite friends; rewards = extra AI credits / extra mocks / premium access. Lowest-cost acquisition channel for an unfunded entrant; build once the core loop retains.

---

## 17. Multi-Exam Expansion Framework *(criteria, not a wish-list)*

Add an exam **only when all are true:** existing content is available, candidate volume is large, monetization is strong, and content operations remain manageable.

**Recommended sequence:**
`Assam TET → other Northeast TETs → KVS → NVS → SSC → Banking → Railway`

(CTET sits at top-of-funnel throughout; ranked exams later because they carry the recurring-revenue LTV the qualifying exams lack.)

---

## 18. Technology Architecture

**Frontend:** Next.js · Tailwind · shadcn/ui — low-end-Android & low-bandwidth tested.
**Backend:** Django + DRF.
**Async (required):** Celery + Redis — ingestion, daily practice, reminders.
**Database:** PostgreSQL **+ pgvector** (semantic dedupe; no separate vector DB).
**Payments:** **Razorpay — already registered**, so the Season Pass paywall can ship as soon as the engine is ready.
**Storage (MVP):** **Owned VPS** — `/uploads/questions`, `/uploads/ncert`, `/uploads/answerkeys` — with **automated off-box backups (non-negotiable)**. Scale: Cloudflare R2.
**Automation:** **Self-hosted n8n (already running)** — ingestion + reminder orchestration at near-zero marginal cost.
**Messaging:** **Telegram (now) · Email (now) · WhatsApp via Twilio.**
**AI:** Groq (cheap/fast — default) + OpenAI (quality — escalation). Defined routing, not just both listed.
**Hosting:** owned VPS (adequate ≤100 users; don't over-engineer).
**Observability:** Sentry + structured logging.

### 18.1 WhatsApp via Twilio — implementation notes
Twilio acts as your WhatsApp Business Service Provider, so you don't manage the raw Business API yourself. Plan for the platform's constraints regardless of provider:
- **Template approval** is required for business-initiated messages (reminders, score summaries). Submit templates early — approval is not instant.
- **24-hour session window:** free-form replies are only allowed within 24h of a user message; outside it you must use approved templates.
- **Explicit opt-in** is mandatory and should be captured at signup.
- Keep **Telegram as the primary community/automation channel**; treat WhatsApp (Twilio) as the higher-trust transactional channel (reminders, results) once templates clear.

### 18.2 AI Cost Governance *(margin protection)*
- Per-user **daily token budget** + rate limits on tutor and generator.
- **Caching** + **explanation reuse** for repeated/common questions.
- Cheapest-capable-model **routing**; escalate only when needed.
- **Monthly AI-spend monitoring** with per-user / per-plan cost dashboard.
- A standing **margin-protection framework**: if AI cost per paying user approaches a set % of plan price, throttle or re-route automatically.

---

## 19. Data Asset Strategy *(long-term strategic asset)*

Systematically store, per question and topic: **performance, topic performance, difficulty scores, success probability, most-missed questions, most-important topics.** Over time this becomes **proprietary educational intelligence** — knowing what actually matters and what students actually get wrong, at the regional level — which improves personalization, sharpens content, and is the asset a competitor cannot buy or scrape. This is the compounding endgame behind the §4.4 moat.

---

## 20. Compliance & Security

- **DPDP Act 2023:** explicit consent, purpose limitation, data export/deletion, breach process for PII (name/mobile/email).
- Auth hardening: rate-limited login, hashed passwords, secure OTP.
- WhatsApp/Telegram messaging opt-in and frequency-capped.

---

## 21. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Qualifying-exam caps subscription LTV | High | Season Pass + ranked exams + institution line |
| Free incumbents (Adda247/Testbook/Oliveboard) | High | Regional-language depth; beachhead focus |
| Content correctness / wrong AI questions | High | Draft-only + human review + audits (§11) |
| AI ingestion weak on scanned/Science papers | High | Manual-entry fallback first; AI assistive |
| AI tutor cost > plan price | Medium | §18.2 cost governance |
| WhatsApp template/opt-in friction | Medium | Telegram-first; submit Twilio templates early |
| Single-VPS data loss | Medium | Automated off-box backups |
| Low willingness to pay | Medium | Validate price at Gate 3 before scaling |
| Founder overbuilding | Medium | Validation gates (§14) + exit criteria (§15) |

---

## 22. Instrumentation

Track from day one: activation (first mock), the core loop (`practice → analytics → weak-topic practice → revision`), retention by days-to-exam, Season Pass conversion, AI cost/user, NPS/referral, and the North Star (weekly active learners completing practice).

---

## 23. Long-Term Vision

Not "Duolingo for everything" — that framing assumes open-ended engagement a qualifying exam doesn't have. Instead: **become the trusted, regional-first learning & assessment platform — built on personalization, analytics, coaching-centre relationships, and proprietary educational intelligence — that dominates an underserved beachhead and earns the right to expand into ranked exams nationally.** Win narrow, then widen.

---

### Appendix — changes from v2 → v3
1. Committed to the regional beachhead; repositioned to "Personalized Learning & Assessment Platform for Regional Competitive Exams" with CTET as acquisition channel.
2. Added **Founder Advantage** and **Competitive Moat** (regional depth, weak-topic intelligence, personal mentor, data moat).
3. Expanded **Institution Product Line** + LTV rationale; added **Parent Dashboard** to future roadmap.
4. Added **Learning Methodology**, **Personal Learning Engine** (new core loop), **Content Operations**, **Data Asset Strategy**.
5. Added **North Star metric**, **Validation Gates**, **Exit/Pivot Criteria**, **Founder Execution (business) Roadmap**, **Community + Referral**, **Multi-Exam Expansion Framework**.
6. Expanded **AI Cost Governance**; updated architecture for confirmed infra: **owned VPS + self-hosted n8n, Razorpay registered, WhatsApp via Twilio** (with template/opt-in/24h-window notes).
