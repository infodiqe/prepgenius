# Product Requirements Document (PRD) — v2 (Revised)

**Product (working title):** PrepGenius AI
**Document owner:** [Founder]
**Status:** Draft for strategic review
**Last updated:** 30 May 2026

> **Reviewer's note (read first).** This is a strategy-corrected rewrite of the original PRD. The biggest change is *not* a feature change — it is a reframing of the business around two facts the original PRD did not account for:
> 1. **CTET is a qualifying (pass/fail) exam with lifetime certificate validity.** Users pass once and leave. This caps subscription LTV by design.
> 2. **The market is dominated by free, crore-scale incumbents** (Adda247, Testbook, Oliveboard) that already offer mock tests, analytics, AI doubt-solving and multi-language support — including Assamese.
>
> Everything strategic below follows from those two facts. Sections marked **[DECISION NEEDED]** require a founder call.

---

## 1. The Strategic Problem (and the wedge)

A new, unfunded entrant cannot win pan-India CTET head-to-head against incumbents who give the core product away free and have crore-scale user bases. To survive, this product must:

- **Win a beachhead the giants treat as an afterthought**, dominate it, earn trust, then expand.
- **Monetize in a way that matches the shape of the exam**, not against it.

### Recommended wedge — [DECISION NEEDED]
**Option A (recommended): Regional beachhead.**
Go deep and demonstrably higher-quality on **Assam TET + Northeast state TETs**, delivered in **Assamese-first** with an AI tutor fluent in regional context and syllabus. Use **CTET Paper II (Science)** as the broad, low-cost top-of-funnel. The bet: incumbents are a mile wide and an inch deep on regional TETs; a focused team can be the clear best option for a few lakh underserved aspirants.

**Option B: Broad pan-India CTET.**
Compete directly with incumbents. *Not recommended* without funding and a sharp, defensible differentiator — the current feature set is table stakes.

*The rest of this PRD assumes Option A. Items that would change under Option B are flagged.*

---

## 2. Product Vision

A personalized exam-prep platform that helps an aspirant go from "I don't know my weak topics" to "I cleared the exam" as efficiently as possible — by combining previous-year papers, adaptive practice, AI explanations in the candidate's language, performance analytics, and habit automation.

**Initial target:** CTET Paper II (Science) — top-of-funnel.
**Beachhead to dominate (Option A):** Assam TET + Northeast state TETs.
**Future expansion (sequenced by LTV, not by list):** ranked recruitment exams that *reward repeat use* — State TETs feeding merit ranking, SSC, Banking, Railway — and the institution/coaching channel.

---

## 3. Business Goals & Revenue Model

### Phased goals
- **Phase 0 — Validate (pilot):** 10–15 real aspirants completing a full prep cycle; prove the core loop (practice → analytics → improvement → "I felt ready").
- **Phase 1 — Beachhead:** Become the clear best Assam/NE TET prep tool; 100 paying users.
- **Phase 2 — Durable revenue:** Add ranked exams + institution plan to build LTV beyond the qualifying-exam ceiling.

### Revenue model (reframed for a qualifying exam) — [DECISION NEEDED on prices]
The original monthly subscription fights the exam's nature. Replace/augment it:

| Plan | Shape | Indicative price | Rationale |
|---|---|---|---|
| **Free** | 2 mocks/day + previous-year papers | ₹0 | Acquisition; matches incumbent expectation |
| **Season Pass ("Crack It")** | One-time, valid to exam date: unlimited practice, AI tutor, weak-topic analysis, daily plan | ₹499–₹999 / season | Aligns price to a pass-once exam; higher perceived value than a small monthly fee |
| **Subscription** | Monthly — **only for ranked/repeat exams** (SSC/Banking/Railway) | ₹199–₹299 / mo | Recurring revenue where repeat use is real |
| **Institution** | Coaching centres: teacher dashboards, batch analytics, white-label | Per-seat / annual | Buyer that does NOT churn when a student passes — potentially the strongest line |

### Unit economics to model before building (currently missing)
- **CAC** by channel (Telegram communities, coaching tie-ups, organic).
- **Gross margin per paid user after AI cost** — the AI tutor is your main variable cost; model it explicitly (see §9 cost controls).
- **LTV** — accept that CTET LTV is low/one-shot; justify the business on beachhead trust → ranked-exam + institution LTV.

---

## 4. Success Metrics (reality-checked)

The original targets (70% WAU, 50% free→paid) are ~10× typical and read as aspirations. Replace with staged targets and treat the originals as North-Star ceilings.

| Metric | Pilot target | Why |
|---|---|---|
| Pilot completion (users finishing a prep cycle) | 8 of 15 | Validates the loop end-to-end |
| Weekly active (during active prep window) | 40–50% | Realistic for a finite-horizon exam |
| Daily practice completion (active users) | 30% | Habit formation is hard; 50% is a stretch goal |
| Free → paid conversion | 3–6% | Industry-typical freemium; 50% is not a real forecast |
| Qualitative: "I felt ready / it found my weak spots" | ≥70% of pilot | The metric that actually predicts referral |
| **Net Promoter / referral rate** | track from day 1 | Referral is the only affordable growth for an unfunded entrant |

---

## 5. Users & Personas

### Primary — Regional TET aspirant (Option A)
- **Profile:** Aspiring govt-school teacher, tier-2/3 town, studies in Assamese/regional language, price-sensitive, mobile-first (low-end Android), patchy connectivity.
- **Needs:** Quality practice in their language, knowing weak topics, accountability, affordability.
- **Pains:** Big apps are English/Hindi-centric and shallow on regional TET specifics; overwhelmed by syllabus; no accountability.

### Secondary — CTET Paper II (Science) candidate
- Broad top-of-funnel; converts a fraction to Season Pass.

### Buyer (Institution track) — Coaching-centre owner/teacher
- **Needs:** Track a batch, identify weak students, save content-prep time.
- **Why they matter:** They pay and **don't churn on student success.**

> **Add a "first 15 users" plan:** name the actual communities/coaching contacts you'll recruit the pilot from. Distribution is the hardest part, not the build.

---

## 6. Product Modules

*(Modules unchanged in intent from v1 where they were sound; changes and additions are noted in **bold**.)*

### Module 1 — Authentication & Profile
Registration, login, password reset, email/OTP verification. Profile: name, email, mobile, **target exam, exam date, preferred language (Assamese/Hindi/English)**. **DPDP-compliant consent + data-deletion flow (see §9).**

### Module 2 — Dashboard
Daily goal, streak, accuracy %, questions attempted, subject-wise performance, weak topics, recommended practice, upcoming mocks. **Plus: "days to exam" countdown** — reinforces the finite-horizon framing.

### Module 3 — Question Bank
Attributes: question, options, answer, explanation, subject, topic, subtopic, difficulty, source, year, language, tags. **Add: `appeared_in[]` (years), `review_status` (draft/approved/published), `origin` (official/AI-generated/manual), `verified_by`.**

### Module 4 — Admin Question Ingestion **(highest technical risk — descope aggressively)**
Admin uploads previous papers / answer keys / PDFs. System extracts text, detects questions/options/answers, drafts an explanation, tags subject/topic, flags duplicates. **Admin reviews before publishing — mandatory.**
- **Pilot reality:** treat the auto-pipeline as *assistive*, not autonomous. Ship a clean **manual-entry UI fallback** first; the AI extractor is a productivity aid layered on top.
- **Duplicate detection:** semantic similarity via **pgvector in Postgres** (no separate vector DB). Store one master question with full appearance history for trend analysis.

### Module 5 — Exam Engine
Topic practice, subject practice, previous-year paper (exact), mixed practice, full mock (CTET pattern, 150Q / 150 min). Interface: timer, navigator, save & next, mark for review, auto-submit, full-screen, **mobile-responsive and low-bandwidth tolerant** (offline-resilient submission). Question states: not visited / visited / answered / marked / answered+marked.

### Module 6 — Result Analytics
Score, correct/incorrect/skipped, accuracy, subject & topic analytics, time analytics (avg/fastest/slowest), improvement trend (7/30/90 days). **Frame analytics around "are you above the pass line per section?"** not just raw improvement.

### Module 7 — AI Tutor
Ask "why is B correct?", "explain this concept", "explain in Assamese/English", "another example", "similar question". Uses question + explanation + topic context. **No vector DB in MVP (correct).** **Hard requirement: per-user rate limits + token budget (see §9).**

### Module 8 — AI Question Generator **(trust-critical)**
Generates topic-wise questions at easy/medium/hard with answer + explanation, grounded in previous-year patterns + NCERT.
- **Policy: AI questions are DRAFT-ONLY. Never auto-published. Always human-reviewed and clearly distinguishable from official questions.** One wrong question erodes trust irreversibly.

### Module 9 — Personalized Daily Practice
10–20 questions/day from weak topics, missed questions, recent mistakes. Background-job generated (Celery). Goal: habit during the active prep window.

### Module 10 — Study Plan Generator
Inputs: target exam, exam date, hours/day. Output: dated plan with topic sequence, practice goals, mock schedule — **anchored to the exam-date countdown.**

### Module 11 — Engagement Automation
Channels: **Telegram (MVP), Email (MVP), WhatsApp (deferred — needs WhatsApp Business API approval; do not assume it's quick).** Engine: n8n.
Reminders: daily inactivity, weak-topic, streak-at-risk, scheduled mock, weekly motivational. **Keep messages opt-in and frequency-capped to avoid spam-blocking.**

### Module 12 — Leaderboard (V2)
Daily/weekly/subject rank. **Note: leaderboards matter far more for *ranked* exams than for pass/fail CTET — sequence with the ranked-exam expansion.**

### Module 13 — Admin Portal
Manage users, questions, subjects, topics, exams, mocks; **review queue for AI-generated content**; analytics dashboard.

---

## 7. MVP Scope (realistic, sequenced)

The original "13 modules in 6 weeks" is not achievable. Sequence by what proves the business.

**Pilot build (target ~6–8 weeks, ruthless):**
1. Auth + profile
2. **Manual question-entry UI** + question bank
3. Previous-year papers + topic/subject practice + full mock engine
4. Result analytics
5. AI explanation (tutor) with rate limits
6. Telegram reminders (basic)
7. Admin dashboard (review + publish)

**Fast-follow (after pilot signal):**
- AI ingestion extractor (assistive), duplicate detection (pgvector)
- AI question generator (draft-only)
- Personalized daily practice, study-plan generator
- Razorpay + Season Pass paywall

**Explicitly out of scope for MVP:** mobile app, leaderboards, subscriptions for CTET, advanced AI coaching, multi-exam, voice tutor, full RAG, cloud storage.

---

## 8. Go-To-Market (was missing — essential)

- **First 15:** recruit by hand from named Assam/NE TET Telegram groups, Facebook communities, and 1–2 friendly coaching centres. Onboard personally; watch them use it.
- **First 100:** referral loop + coaching-centre pilots (institution track) + organic regional-language content (the incumbents underserve this).
- **Channel focus:** Telegram is where these communities already live — meet them there before building WhatsApp.
- **Positioning line to test:** "The best [Assam TET] practice in Assamese — find your weak topics, fix them, pass." Not "AI-powered everything."

---

## 9. Technology Architecture (completed)

**Frontend:** Next.js, Tailwind, shadcn/ui. Low-end-Android and low-bandwidth tested.
**Backend:** Django + Django REST Framework.
**Async (NEW — required):** **Celery + Redis** for ingestion, daily-practice generation, reminders.
**Database:** PostgreSQL **+ pgvector** (semantic dedupe without separate vector infra).
**Payments (NEW):** **Razorpay**.
**Storage (MVP):** Local VPS — `/uploads/questions`, `/uploads/ncert`, `/uploads/answerkeys` — **with automated off-box backups (non-negotiable; otherwise one disk failure loses the question bank).** Scale: Cloudflare R2.
**Automation:** n8n.
**AI:** Groq (cheap/fast — default for tutor/draft) + OpenAI (quality — fallback/complex). **Define routing, don't just list both.**
**Hosting:** Current VPS (adequate for ≤100 users; don't over-engineer).
**Observability (NEW):** Sentry + structured logging.

### AI cost & abuse controls (NEW — protects margin)
- Per-user **daily token budget** and **rate limits** on tutor & generator.
- **Response caching** for repeated/common explanations.
- Cheapest-capable-model routing; escalate only when needed.
- Cost dashboard per user/plan.

### Compliance & security (NEW)
- **DPDP Act 2023:** explicit consent, purpose limitation, data-deletion/export, breach process for PII (name/mobile/email).
- Standard auth hardening (rate-limited login, hashed passwords, secure OTP).

---

## 10. Content Quality & QA (NEW — this IS the product)

In exam prep, content correctness *is* the product. A single wrong "official" question kills trust.
- Every published question has a `review_status` and `verified_by`.
- AI-generated and AI-extracted content is **draft-only** until human-approved.
- Official questions visually distinguished from AI-generated practice.
- Periodic spot-audit of published explanations.

---

## 11. Risk Register (NEW)

| Risk | Severity | Mitigation |
|---|---|---|
| Qualifying-exam caps subscription LTV | High | Season Pass + ranked-exam + institution revenue |
| Free incumbents (Adda247/Testbook) | High | Regional-language beachhead; depth over breadth |
| AI ingestion underperforms on scanned/Science papers | High | Manual-entry fallback first; AI assistive |
| Wrong AI questions erode trust | High | Draft-only + mandatory human review |
| AI tutor costs exceed plan price | Medium | Token budgets, caching, model routing |
| WhatsApp API approval delays | Medium | Telegram-first; WhatsApp deferred |
| Data loss on single VPS | Medium | Automated off-box backups |
| Low willingness to pay | Medium | Validate price in pilot before scaling |

---

## 12. Instrumentation (NEW)

Track from day one: activation (first mock completed), the core loop (practice → analytics viewed → weak-topic practice taken), retention by days-to-exam, conversion to Season Pass, AI cost per user, NPS/referral. You cannot improve what you don't measure — the original metrics had no measurement plan.

---

## 13. Long-Term Vision

The "Duolingo for competitive exams" framing only holds for exams with *open-ended* engagement. Reframe: **become the trusted regional-first prep platform that wins an underserved beachhead, then expands into ranked exams and institutions where daily engagement and recurring revenue are real.** Earn the right to be broad by being the undisputed best at something narrow first.

---

### Appendix — Key changes from v1
1. Reframed business model around CTET being qualifying / lifetime-valid (Season Pass, not monthly sub).
2. Added regional beachhead strategy and competitive reality.
3. Reality-checked success metrics.
4. Added GTM, unit economics, risk register, instrumentation, content-QA policy.
5. Completed the architecture (Celery/Redis, pgvector, Razorpay, Sentry, backups, DPDP, AI cost controls).
6. Made MVP scope realistic and sequenced; AI ingestion/generation made assistive and draft-only.
