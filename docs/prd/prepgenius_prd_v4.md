# Product Requirements Document (PRD) — v4

**Product (working title):** PrepGenius AI
**Positioning:** *Personalized Learning & Assessment Platform for Regional Competitive Exams*
**Document owner:** [Founder]
**Status:** Strategy-locked (v3 approved); v4 adds product/architecture detail only
**Last updated:** 30 May 2026

> **What changed v3 → v4.** No change to strategy, positioning, roadmap, architecture stack, MVP scope, or business model. v4 adds the detail that makes the approved direction buildable: a **config-driven exam framework**, **stronger AI-generation governance**, **content-operations roles**, an **AI credit system** (unified with the existing cost-governance), an **expanded adaptive daily-practice engine**, and an **Exam Readiness Score** module.
>
> **Architect's refinements (explicit):** (1) the exam framework is adopted as a *data model now, configuration tooling when exam #2 onboards* — to honour the don't-overbuild discipline; (2) AI credits are the user-facing unit over the existing token-cost backend — one ledger, not two systems; the Season Pass "unlimited" now means *unlimited practice, AI metered by credits*; (3) Exam Readiness *Score* (heuristic) ships before pass-*probability* (which needs real outcome data to calibrate).

---

## 1. Strategy: the wedge (committed)

A new, unfunded entrant cannot beat pan-India incumbents who give the core product away free. So the strategy is **win an underserved beachhead, dominate it, then expand by LTV — not by feature list.**

**Committed direction:** **Assamese-first**, deep and higher-quality on **Assam TET + Northeast state TETs**, with **CTET Paper II (Science)** as the broad low-cost top-of-funnel. Earn trust in a niche the giants treat as an afterthought, then expand into ranked exams and the institution channel where recurring revenue is real.

---

## 2. Founder Advantage *(why THIS founder can win)*

- **Regional insider.** From Assam; understands the regional education ecosystem and what aspirants actually struggle with.
- **Language-native.** Understands Assamese-speaking users — the incumbents *translate*; this product can be *native*.
- **Warm distribution.** Already has access to pilot CTET/TET candidates — solving the hardest new-product problem on day zero.
- **Automation depth.** Strong workflow-automation experience (n8n, Workfront, integrations) → automates content ingestion and ops.
- **Operational leverage.** Keeps the team tiny and margins high.
- **Bootstrap infrastructure.** Already owns a VPS and runs self-hosted n8n → near-zero marginal infra cost.

**Why this is an unfair advantage:** incumbents win on breadth and capital; this founder wins on **depth, language, trust, warm distribution, and a cost base low enough to be profitable at a scale invisible to them.**

---

## 3. Product Vision

Help a regional aspirant go from *"I don't know my weak topics"* to *"I cleared the exam"* as efficiently as possible — through native-language practice, an adaptive personal learning engine, AI explanations in their language, analytics that map to the pass line, and habit automation. CTET acquires; the platform retains and expands.

---

## 4. Competitive Moat *(durable, compounding)*

### 4.1 Regional language depth
An **Assamese-first** experience (UI, explanations, AI tutor, support), not a bolt-on translation.

### 4.2 Weak-topic intelligence (not just analytics)
Identifies **weak topics, weak concepts, repeated mistake patterns**, and provides **suggested remediation** — closing the loop from "you're weak here" to "here's exactly what to do."

### 4.3 Personal AI mentor
The student should feel **"the platform knows me."**

### 4.4 Proprietary question intelligence (data moat)
Store, per question/topic: **question history, appearance frequency, topic frequency, success rates, difficulty patterns** — a dataset competitors cannot easily replicate (see §21).

---

## 5. Business Goals & Revenue Model

### Phased goals
- **Phase 0 — Validate:** 10–15 aspirants complete a full prep cycle.
- **Phase 1 — Beachhead:** clear best Assam/NE TET tool; 100 active, 10 paying.
- **Phase 2 — Durable revenue:** institution line + ranked exams to break the qualifying-exam LTV ceiling.

### Revenue model
| Plan | Shape | Indicative price | Rationale |
|---|---|---|---|
| **Free** | 2 mocks/day + previous-year papers | ₹0 | Acquisition |
| **Season Pass ("Crack It")** | One-time to exam date: **unlimited practice + AI mentor (within monthly AI credits)**, weak-topic remediation, daily plan | ₹499–₹999 / season | Price aligned to a pass-once exam |
| **Subscription** | Monthly — ranked/repeat exams only | ₹199–₹299 / mo | Recurring revenue where repeat use is real |
| **Institution** | Coaching centres (§5.1) + pooled AI credits (§5.2) | Per-student / per-batch / annual | Buyer that does not churn on student success |

### 5.1 Institution Product Line
**Teacher Dashboard:** student performance, weak students surfaced, attendance, practice completion.
**Batch Analytics:** topic-level performance, class-level trends, cohort comparison.
**Custom Mock Tests:** teacher creates and assigns mocks.
**White-Label:** coaching-centre branding.
**Revenue:** per student / per batch / annual license.
**Why institutions beat individuals on LTV:** an individual passes once and leaves; a coaching centre has a new batch each cycle, so the relationship renews even as students churn.

### 5.2 AI Credit System *(NEW — the user-facing meter over §20.2 cost governance)*
AI consumption is metered in **credits**, the single user-facing unit; the backend cost is tokens (§20.2). This unifies monetization and margin protection in one ledger rather than two competing systems.

**Individual users:** premium plans include **monthly AI credits**.
**Institutions:** receive **pooled AI credits** (e.g. 1,000 / 5,000 / custom enterprise) and **can purchase additional credits**.

**Credits are consumed by:** AI Tutor · AI Explanation · Doubt Solving · Personalized Guidance · Question Generation.

**The platform tracks:** credit allocation · credit usage · credit balance · monthly consumption — per user and per institution (pooled).

> *Reconciliation note:* "unlimited" in the Season Pass refers to **practice** (non-AI question attempts/mocks remain unlimited). AI features draw from the credit allowance — this protects margin, consistent with the concern raised in §20.2. Prices and the four-tier model are unchanged.

---

## 6. Success Metrics

### 6.1 North Star Metric
**Weekly Active Learners Completing Practice Sessions.**
Supporting: practice sessions completed · mock tests completed · weak-topic practice completed · referral rate.

### 6.2 Reality-checked targets (pilot)
| Metric | Pilot target | Note |
|---|---|---|
| Pilot completion | 8 of 15 | Validates the loop |
| WAU (active prep window) | 40–50% | Realistic for finite-horizon exam |
| Daily practice completion | 30% | 50% is a stretch goal |
| Free → paid | 3–6% | Industry-typical |
| "It found my weak spots / I felt ready" | ≥70% | Predicts referral |
| Referral rate | track from day 1 | Only affordable growth lever |

---

## 7. Users & Personas

- **Primary — Regional TET aspirant:** Assamese/regional-language, tier-2/3, mobile-first, price-sensitive.
- **Secondary — CTET Paper II (Science) candidate:** broad top-of-funnel.
- **Buyer — Coaching-centre owner/teacher:** wants batch visibility; doesn't churn on student success.
- **Future payer — Parent (§10.x):** often a stronger payer than the student.

> **First-15 plan:** name the exact Assam/NE TET Telegram groups, communities, and coaching contacts to recruit from.

---

## 8. Learning Methodology *(educational defensibility)*

- **Active recall** — learning through repeated testing.
- **Spaced repetition** — mistakes resurface on a spacing schedule.
- **Error-based learning** — weak areas get disproportionately more practice.
- **Adaptive learning** — difficulty adjusts to the learner over time.

---

## 9. Personal Learning Engine *(the core loop)*

The engine should detect weak concepts, predict likely future weak areas, and recommend daily practice, revision schedule, and mock frequency.

**Core loop:** `Question → Explanation → Practice → Revision → Mastery`

---

## 10. Product Modules

1. **Auth & Profile** — target exam, exam date, preferred language; DPDP consent + deletion (§22).
2. **Dashboard** — goal, streak, accuracy, weak topics, recommendations, days-to-exam countdown.
3. **Question Bank** — full attributes + `appeared_in[]`, `review_status`, `origin`, `verified_by`, performance/difficulty/success-rate fields (feeds §21).
4. **Admin Ingestion** — assistive pipeline; manual-entry fallback ships first; pgvector dedupe; mandatory human review (§12).
5. **Exam Engine** — topic/subject/mixed/previous-year/full mock; timer, navigator, mark-for-review, auto-submit, full-screen; mobile + low-bandwidth tolerant. *Exam rules and mock templates are read from exam config (§19), not hardcoded.*
6. **Result Analytics** — score, accuracy, subject/topic/time analytics, 7/30/90-day trend; framed against the per-section pass line; feeds the Exam Readiness Score (§11).
7. **Personal Learning Engine (was AI Tutor)** — §9; explanations in Assamese/English; **credit-metered (§5.2)** + rate-limited (§20.2).
8. **AI Question Generator** — see §10.1 (governance expanded).
9. **Personalized Daily Practice** — see §10.2 (adaptive engine expanded).
10. **Study Plan Generator** — exam date + hours/day → dated plan anchored to countdown.
    - **10.x Parent Dashboard (FUTURE — not MVP):** child performance, weekly report, weak topics, improvement trends, study recommendations. Parents are often stronger payers than students.
11. **Engagement Automation** — n8n; Telegram + Email (now), WhatsApp via Twilio (§20.1); reminders frequency-capped and opt-in.
12. **Leaderboard (V2)** — sequence with *ranked* exams.
13. **Admin Portal** — manage users/content/exams; role-based AI-content review queue (§12); analytics.

### 10.1 AI Question Generator — governance *(expanded; draft-only retained)*
AI-generated questions **must**: follow the official **syllabus**; follow **previous-year question patterns**; follow **topic distribution**; follow **difficulty distribution**; follow the **exam blueprint**; follow **exam-specific learning objectives**; **avoid unsupported concepts**; and **generate an answer + explanation**. (These constraints are supplied by the exam config in §19 — the generator is exam-driven.)

**Workflow:**
`Previous Papers + Official Syllabus + Question-Pattern Analysis → AI generates DRAFT question → Human Review → Approval → Publish`

**AI-generated content is never auto-published. All generated content remains Draft until approved** (multi-reviewer support per §12).

### 10.2 Adaptive Daily Practice Engine *(expanded)*
Daily practice is generated from: **selected exam · exam date · weak topics · weak concepts · previous mistakes · performance trends · syllabus coverage · learning history.** The system continuously adapts recommendations.

Examples (driven by exam config, §19):
- **CTET:** CDP + Science + weak areas
- **Assam TET:** relevant topics + weak areas
- **Navodaya:** Math + Mental Ability + Language

---

## 11. Exam Readiness Score *(new module)*

**Purpose:** a predictive measure of exam preparedness.

**Input metrics:** mock-test performance · subject accuracy · topic accuracy · time management · consistency · practice completion · historical trends.

**Outputs:** an **overall readiness score** (e.g. *CTET Readiness: 82%*, *Assam TET Readiness: 74%*), plus **strong areas**, **weak areas**, and **improvement recommendations**.

**Architect note — score now, probability later.** The readiness *score* is a heuristic composite of the signals above and can ship as an analytics enhancement (post-pilot, no roadmap change). **Pass Probability Prediction is a genuine future enhancement** because a calibrated probability requires real pass/fail *outcome* data, which won't exist until after one or more exam cycles produce ground-truth labels.

---

## 12. Content Operations *(largest business risk — own it; roles added)*

Educational trust depends entirely on content quality.

`Upload PDF → AI Extraction → Duplicate Detection → Human Review → Publish → Periodic Audit`

### Roles *(NEW — RBAC; multi-reviewer workflow)*
- **Content Manager:** uploads previous-year papers and syllabus; manages subjects, topics, and exam structures.
- **Content Reviewer:** reviews AI-generated questions; edits, approves, or rejects; verifies explanations.
- **Subject Matter Expert (SME):** validates content accuracy and syllabus alignment; reviews difficult and exam-specific questions.

The approval workflow **supports multiple reviewers** (e.g. Reviewer → SME for difficult items), generalizing the `review_status` field into a role-based state machine.

> **Architect note — design now, staff later.** At pilot (10–15 users) these three roles are the founder. Build the **roles + RBAC + multi-stage review state machine** into the data model now (cheap); staff distinct humans as content volume grows. This avoids both a rebuild later and unnecessary hiring now.

### Quality standards
Every published question carries `review_status` + `verified_by`; AI-extracted **and** AI-generated content is **draft-only** until approved; official questions are visually distinguished from AI-generated practice; scheduled spot-audits; a wrong "official" question is a sev-1 trust incident.

---

## 13. MVP Scope (unchanged)

**Pilot build (~6–8 weeks):** auth + profile · manual question entry + bank · exam engine · result analytics · personal learning engine (explanations) with credit metering + rate limits · Telegram reminders · admin review/publish.
**Fast-follow:** AI ingestion (assistive) + pgvector dedupe · AI generator (draft-only) · adaptive daily practice + study plan · Razorpay paywall + Season Pass · WhatsApp via Twilio · Exam Readiness Score.
**Out of scope for MVP:** mobile app, leaderboards, CTET subscription, advanced coaching, multi-exam, voice tutor, full RAG, cloud storage, parent dashboard, exam-config tooling UI (data model only at MVP — see §19).

---

## 14. Founder Execution Roadmap *(business roadmap — unchanged)*

| Month | Focus |
|---|---|
| **1** | Question bank · mock tests · analytics |
| **2** | Personal learning engine (AI tutor) · Telegram bot |
| **3** | 100 users · Season Pass live (Razorpay) |
| **4** | Assam TET expansion |
| **5** | Institution dashboard |
| **6** | Institution sales |

---

## 15. Validation Gates *(unchanged)*

- **Gate 1 — 15 pilot users:** practice completion, feedback, retention. No new modules until passed.
- **Gate 2 — 100 users:** DAU, WAU, conversion.
- **Gate 3 — 10 paying users:** required before expanding development.
- **Gate 4 — 50 paying users:** required before adding additional exams.

---

## 16. Exit / Pivot Criteria *(unchanged)*

Pivot or stop if, after a fair test: retention < 20% after pilot; fewer than 5 paying users at 100 active; no institution demand.

---

## 17. Growth: Community & Referral

### 17.1 Community Layer
A **Telegram community**: daily questions, weekly challenges, exam discussions, live doubt-solving.

### 17.2 Referral System (future)
Students invite friends; rewards = extra **AI credits** / extra mocks / premium access (credits per §5.2).

---

## 18. Multi-Exam Expansion Framework *(criteria, not a wish-list)*

Add an exam **only when all are true:** existing content available · large candidate volume · strong monetization · content operations manageable.

**Recommended sequence:** `Assam TET → other Northeast TETs → KVS → NVS → SSC → Banking → Railway`
(CTET stays top-of-funnel; ranked exams later for recurring LTV.)

---

## 19. Exam Framework Architecture *(NEW — config-driven, not hardcoded)*

The platform is designed as a **generic, exam-driven engine**, not a CTET-specific app. Every exam is **configurable as data**, so new exams onboard without major code changes.

**Each exam is defined by:** Exam Name · Exam Type · Subjects · Topics · Subtopics · Syllabus · Difficulty Levels · Previous-Year Papers · Mock-Test Templates · Exam Rules · Analytics Rules · Passing Criteria.

This single configuration object feeds the exam engine (§10.5), the analytics/readiness layer (§6, §11), the AI generator's constraints (§10.1), and the adaptive practice engine (§10.2) — none of which hardcode any exam.

**Example configurable exams:** CTET · Assam TET · Sainik School Entrance · Navodaya Entrance.

> **Architect sequencing — data model now, tooling when exam #2 onboards.** Building a full no-code exam-builder UI upfront is premature abstraction and would expand the MVP. Therefore:
> - **Now (MVP):** model exams as configuration data (`Exam → Subject → Topic → Subtopic`; rules/blueprint/passing-criteria/analytics-rules as structured fields). CTET is the first *instance* of the config, not a special case in code.
> - **Month 4 (Assam TET):** build the admin configuration tooling, validated against a real second exam — so the abstraction is shaped by two real exams, not one guess.
> - This delivers the architectural benefit (no rewrite to add exams) without changing the MVP scope or roadmap.

> **Compliance flag — exams for minors.** *Sainik School Entrance* and *Navodaya Entrance* are taken by children. Onboarding them triggers children's-data obligations under the DPDP Act (verifiable parental consent; no behavioural profiling/targeting of minors). The exam config should carry an `audience_is_minor` flag that switches on the appropriate consent and data-handling rules; this also aligns with the future Parent Dashboard (§10.x). Not required for the CTET/TET MVP, but designed-for now.

---

## 20. Technology Architecture *(unchanged stack)*

**Frontend:** Next.js · Tailwind · shadcn/ui — low-end-Android & low-bandwidth tested.
**Backend:** Django + DRF.
**Async (required):** Celery + Redis — ingestion, daily practice, reminders.
**Database:** PostgreSQL + pgvector (semantic dedupe; no separate vector DB).
**Payments:** Razorpay — already registered.
**Storage (MVP):** Owned VPS with automated off-box backups (non-negotiable). Scale: Cloudflare R2.
**Automation:** Self-hosted n8n (already running).
**Messaging:** Telegram (now) · Email (now) · WhatsApp via Twilio.
**AI:** Groq (cheap/fast — default) + OpenAI (quality — escalation); defined routing.
**Hosting:** owned VPS (adequate ≤100 users).
**Observability:** Sentry + structured logging.

### 20.1 WhatsApp via Twilio — implementation notes
Twilio is the WhatsApp Business Service Provider. Plan for platform constraints regardless of provider: **template approval** for business-initiated messages (submit early); **24-hour session window** for free-form replies; **explicit opt-in** captured at signup. Keep **Telegram primary** for community/automation; treat WhatsApp (Twilio) as the higher-trust transactional channel (reminders, results).

### 20.2 AI Cost Governance + Credit Backend *(unified with §5.2)*
Credits (§5.2) are the user-facing unit; tokens are the backend cost. The same ledger powers both monetization and margin protection:
- Per-user **daily token budget** + rate limits on tutor and generator (enforced via the credit balance).
- **Caching** + **explanation reuse** for repeated/common questions (cache hits cost zero/fewer credits).
- Cheapest-capable-model **routing**; escalate only when needed.
- **Monthly AI-spend monitoring**; per-user / per-institution (pooled) consumption dashboard.
- **Margin-protection framework:** if AI cost per paying user approaches a set % of plan price, throttle or re-route automatically.

---

## 21. Data Asset Strategy *(long-term strategic asset)*

Systematically store, per question/topic: **performance, topic performance, difficulty scores, success probability, most-missed questions, most-important topics.** Over time this becomes **proprietary educational intelligence** — the asset a competitor cannot buy or scrape — and the engine behind §4.4, §11, and personalization.

---

## 22. Compliance & Security

- **DPDP Act 2023:** explicit consent, purpose limitation, data export/deletion, breach process for PII (name/mobile/email).
- **Children's data (future, per §19):** when exams aimed at minors (Sainik/Navodaya) are onboarded, require **verifiable parental consent** and prohibit behavioural profiling/targeting of minors; gate via the `audience_is_minor` config flag.
- Auth hardening: rate-limited login, hashed passwords, secure OTP.
- Messaging opt-in and frequency-capped.

---

## 23. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Qualifying-exam caps subscription LTV | High | Season Pass + ranked exams + institution line |
| Free incumbents | High | Regional-language depth; beachhead focus |
| Content correctness / wrong AI questions | High | Draft-only + multi-reviewer (§12) + audits |
| AI ingestion weak on scanned/Science papers | High | Manual-entry fallback first |
| AI cost > plan price | Medium | Credit system + §20.2 governance |
| Premature generic-engine over-engineering | Medium | Data model now, tooling at exam #2 (§19) |
| Children's-data non-compliance (Sainik/Navodaya) | Medium | `audience_is_minor` flag + parental consent (§22) |
| WhatsApp template/opt-in friction | Medium | Telegram-first; submit Twilio templates early |
| Single-VPS data loss | Medium | Automated off-box backups |
| Founder overbuilding | Medium | Validation gates + exit criteria |

---

## 24. Instrumentation

Track from day one: activation (first mock), the core loop (`practice → analytics → weak-topic practice → revision`), retention by days-to-exam, Season Pass conversion, **AI credit consumption / cost per user**, NPS/referral, readiness-score movement, and the North Star (weekly active learners completing practice).

---

## 25. Long-Term Vision

Become the trusted, **regional-first learning & assessment platform** — built on personalization, analytics, coaching-centre relationships, proprietary educational intelligence, and a **config-driven exam engine** — that dominates an underserved beachhead and earns the right to expand into ranked exams nationally. Win narrow, then widen.

---

### Appendix — changes from v3 → v4 (additive only)
1. **Exam Framework Architecture (§19):** config-driven, exam-as-data engine; *data model in MVP, configuration tooling at exam #2*; `audience_is_minor` flag.
2. **AI Generation Governance (§10.1):** mandatory syllabus/PYQ/topic/difficulty/blueprint/objective constraints; draft-only workflow reaffirmed; exam-config-driven.
3. **Content Operations Roles (§12):** Content Manager, Content Reviewer, SME; multi-reviewer RBAC state machine; *design now, staff later*.
4. **AI Credit System (§5.2):** user/institution credits unified with the §20.2 cost backend; "unlimited" reconciled to *unlimited practice, AI metered*.
5. **Adaptive Daily Practice Engine (§10.2):** expanded inputs; exam-config-driven examples.
6. **Exam Readiness Score (§11):** new module; heuristic score now, calibrated pass-probability future.
- **Compliance (§22) + Risk (§23):** children's-data handling added for minor-audience exams.
- **Unchanged:** strategy, positioning, roadmap (§14), MVP scope (§13), business model, architecture stack (§20). No JEE/NEET.
