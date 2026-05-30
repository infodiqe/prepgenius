# PrepGenius AI — Product Backlog (Epics → Features → User Stories)

Derived from PRD v4. Priority: Highest=P0 (MVP) · High=P1 (Fast-Follow) · Medium=P2 (Post-MVP).


## PG-001 · EPIC: Authentication & Access Management

_Secure accounts, sessions, profiles, consent and RBAC for all users._

### PG-002 · Feature: Registration & Verification

**PG-003 · Register an account**  _( Highest / MVP · 3 pts )_

- As a candidate, I want to register with my email and mobile number, so that I can create an account and start preparing.
- **Acceptance criteria:** Valid email and phone are accepted; invalid formats rejected with clear errors | Duplicate email is rejected with a helpful message | Password meets policy and is hashed with Argon2 server-side | Explicit data-processing consent is captured at signup | Unverified accounts cannot access paid/AI features
- **Dependencies:** PostgreSQL users table; Consent (DPDP)

**PG-004 · Verify email / OTP**  _( Highest / MVP · 2 pts )_

- As a candidate, I want to verify my account via email link or OTP, so that the platform trusts my identity.
- **Acceptance criteria:** Verification link or OTP is delivered | OTP expires after a set window and is single-use | Verified flag is set on success | Resend is supported and rate-limited
- **Dependencies:** Registration

### PG-005 · Feature: Login & Session

**PG-006 · Log in securely**  _( Highest / MVP · 3 pts )_

- As a user, I want to log in with my credentials, so that I can access my account safely.
- **Acceptance criteria:** Correct credentials create a session via httpOnly Secure cookie | Incorrect credentials are rejected without revealing which field failed | Login is rate-limited and locks out after repeated failures | Access + refresh tokens issued; refresh rotates and old tokens are invalidated
- **Dependencies:** Redis (rate limiting)

**PG-007 · Reset forgotten password**  _( Highest / MVP · 2 pts )_

- As a user, I want to reset my password via a secure link, so that I can regain access if I forget it.
- **Acceptance criteria:** Reset link expires and is single-use | Password is updated and all existing sessions are invalidated | Reset requests are rate-limited
- **Dependencies:** Login & Session

### PG-008 · Feature: Profile & Consent (DPDP)

**PG-009 · Manage my profile**  _( Highest / MVP · 2 pts )_

- As a user, I want to edit my name, target exam, exam date and preferred language, so that the app personalizes to me.
- **Acceptance criteria:** All fields editable and persisted | Preferred language defaults to Assamese | Exam date drives the dashboard countdown | Target exam scopes practice and analytics
- **Dependencies:** Exam configuration

**PG-010 · Exercise my data rights**  _( Highest / MVP · 5 pts )_

- As a user, I want to give or withdraw consent and delete my account, so that my privacy rights are respected under the DPDP Act.
- **Acceptance criteria:** Consent recorded with purpose, version and timestamp | Data export is available on request | Deletion anonymizes PII and de-links (not deletes) financial/audit rows | Minor accounts require verifiable parental consent before activation
- **Dependencies:** Credit ledger; Compliance

### PG-011 · Feature: Role-Based Access Control

**PG-012 · Enforce RBAC**  _( Highest / MVP · 5 pts )_

- As a platform, I want to restrict each user to permitted functions by role, so that the system is secure and tenant-safe.
- **Acceptance criteria:** Roles defined: student, teacher, institution_admin, content_manager, content_reviewer, sme, platform_admin | Every endpoint enforces RBAC server-side (UI hiding is not sufficient) | Unauthorized access returns 403 and is logged | Institution-scoped roles cannot access other tenants
- **Dependencies:** Multi-tenancy scoping

## PG-013 · EPIC: Student Dashboard

_At-a-glance progress, recommendations and exam countdown for students._

### PG-014 · Feature: Dashboard Overview

**PG-015 · See progress overview**  _( Highest / MVP · 3 pts )_

- As a student, I want to see my daily goal, streak, accuracy and questions attempted, so that I can track progress at a glance.
- **Acceptance criteria:** Daily goal, current streak, accuracy % and questions-attempted shown | Values reconcile with backend analytics | Loads within performance budget on low-end devices
- **Dependencies:** Result Analytics

**PG-016 · See exam countdown**  _( Highest / MVP · 1 pts )_

- As a student, I want to see a days-to-exam countdown, so that I feel the timeline and stay urgent.
- **Acceptance criteria:** Countdown computed from exam_date | Hidden gracefully when no exam date is set
- **Dependencies:** Profile

### PG-017 · Feature: Recommendations

**PG-018 · See weak topics & recommendations**  _( Highest / MVP · 3 pts )_

- As a student, I want to see my weak topics and recommended practice, so that I know exactly what to study next.
- **Acceptance criteria:** Weak topics surfaced from analytics | Recommended practice links directly into a session | Recommendations refresh after new attempts
- **Dependencies:** Result Analytics; Exam Engine

**PG-019 · See upcoming mocks & subject performance**  _( High / Fast-Follow · 2 pts )_

- As a student, I want to see upcoming mocks and subject-wise performance, so that I can plan my week.
- **Acceptance criteria:** Upcoming mock tests listed | Subject performance is accurate and up to date
- **Dependencies:** Result Analytics

## PG-020 · EPIC: Question Bank & Content Model

_Config-driven question bank with manual entry, ingestion, dedup and appearance history._

### PG-021 · Feature: Question Model & Manual Entry

**PG-022 · Create questions manually**  _( Highest / MVP · 3 pts )_

- As a content manager, I want to create questions with options, answer, explanation, subject/topic/subtopic, difficulty, language and tags, so that the bank has trustworthy content from day one.
- **Acceptance criteria:** Required fields enforced; exactly one correct option | Question created as Draft with origin=manual | Language and difficulty captured | Question is linked to a subtopic and exam
- **Dependencies:** Exam configuration; Content Review

**PG-023 · Record appearance history**  _( Highest / MVP · 2 pts )_

- As a content manager, I want to record the years and papers a question appeared in, so that we can do trend and frequency analysis.
- **Acceptance criteria:** Appearances added as (year, paper) | One master question retained; no duplicate masters | Full appearance history visible on the question
- **Dependencies:** Previous-year papers

### PG-024 · Feature: Automated Ingestion

**PG-025 · Ingest previous-year papers**  _( High / Fast-Follow · 8 pts )_

- As a content manager, I want to upload a previous-year paper PDF and have the system draft questions, options and answers, so that manual effort is reduced.
- **Acceptance criteria:** PDF upload accepted; extraction runs asynchronously (Celery) | System creates Draft questions; extraction errors flagged for review | Manual-entry fallback available when extraction is poor | Nothing is ever auto-published
- **Dependencies:** Celery; ai_gateway; Content Review

**PG-026 · Detect duplicate questions**  _( High / Fast-Follow · 5 pts )_

- As a system, I want to detect near-duplicate questions on ingest using pgvector and trigram similarity, so that the bank stays clean and trustworthy.
- **Acceptance criteria:** Semantic (pgvector) + lexical (pg_trgm) candidates computed | Candidates surfaced to a reviewer | Questions are never auto-merged
- **Dependencies:** pgvector; Ingestion

## PG-027 · EPIC: Exam Engine

_Config-driven practice and mock test engine with reliable, server-authoritative sessions._

### PG-028 · Feature: Practice Modes

**PG-029 · Practice by topic/subject/mixed**  _( Highest / MVP · 5 pts )_

- As a student, I want to practice questions by topic, subject or mixed sets, so that I can practice flexibly.
- **Acceptance criteria:** Scope selection builds a session from published questions only | Filters (subject/topic/difficulty) apply correctly | Composition follows exam config, not hardcoded logic
- **Dependencies:** Question Bank (published); Exam config

**PG-030 · Attempt previous-year paper**  _( Highest / MVP · 3 pts )_

- As a student, I want to attempt the exact previous-year paper, so that I can simulate the real exam.
- **Acceptance criteria:** Exact questions load in original order | Timing follows exam config
- **Dependencies:** Question Bank; Appearance history

### PG-031 · Feature: Mock Test Interface

**PG-032 · Take a full mock test**  _( Highest / MVP · 8 pts )_

- As a student, I want to take a full mock (CTET pattern 150Q/150min) with timer, navigator, save & next, mark for review, auto-submit and full-screen, so that I get realistic, high-fidelity practice.
- **Acceptance criteria:** Question count and duration come from exam config | Navigator shows question states (not visited/visited/answered/marked/answered+marked) | Mark-for-review and save & next work | Auto-submit fires at time expiry; full-screen and mobile-responsive
- **Dependencies:** Exam config; Question Bank

**PG-033 · Never lose progress on flaky networks**  _( Highest / MVP · 5 pts )_

- As a student, I want to have my answers saved reliably and the timer enforced server-side, so that I never lose progress or gain/lose time.
- **Acceptance criteria:** Answer save is idempotent per (session, question) | Answers buffer offline and sync on reconnect | Timer is server-authoritative; client only displays the countdown | Auto-submit occurs even if the client disconnects
- **Dependencies:** Redis; Celery (auto-submit)

### PG-034 · Feature: Scoring

**PG-035 · Score by exam config rules**  _( Highest / MVP · 3 pts )_

- As a system, I want to score attempts using marks, negative-marking and pass-line from exam config, so that every exam scores correctly without code changes.
- **Acceptance criteria:** Scoring reads rules from exam config | CTET applies no negative marking | Results are framed against the per-section pass line
- **Dependencies:** Exam config

## PG-036 · EPIC: Result Analytics & Readiness

_Immediate results, trends, and a predictive Exam Readiness Score._

### PG-037 · Feature: Result Breakdown

**PG-038 · See immediate results**  _( Highest / MVP · 3 pts )_

- As a student, I want to see score, correct/incorrect/skipped and accuracy right after submitting, so that I know how I did instantly.
- **Acceptance criteria:** Results shown on submission and match scoring | Per-section breakdown displayed
- **Dependencies:** Exam Engine

**PG-039 · See subject & topic analytics**  _( Highest / MVP · 3 pts )_

- As a student, I want to see subject- and topic-level analytics, so that I understand my strengths and weaknesses.
- **Acceptance criteria:** Subject accuracy and topic accuracy displayed | Framed against the pass line
- **Dependencies:** Exam Engine

### PG-040 · Feature: Trends & Readiness

**PG-041 · See improvement trends**  _( High / Fast-Follow · 5 pts )_

- As a student, I want to see my trends over 7/30/90 days, so that I can see progress over time.
- **Acceptance criteria:** Trend windows computed from aggregates | Updates after new attempts
- **Dependencies:** Result Breakdown; Celery

**PG-042 · See Exam Readiness Score**  _( High / Fast-Follow · 5 pts )_

- As a student, I want to see a readiness score with strong/weak areas and recommendations, so that I can gauge how prepared I am.
- **Acceptance criteria:** Composite score computed from configured weights | Strong areas, weak areas and recommendations shown | Pass-probability prediction is explicitly out of scope (future, needs outcome data)
- **Dependencies:** Result Breakdown; Exam config (analytics rules)

## PG-043 · EPIC: AI Tutor

_Multilingual, credit-metered explanations and concept help._

### PG-044 · Feature: Ask & Explain

**PG-045 · Ask why an answer is correct**  _( Highest / MVP · 5 pts )_

- As a student, I want to ask why an answer is correct and get an explanation, so that I understand the concept, not just the answer.
- **Acceptance criteria:** Tutor uses question, options, explanation and topic context | Response is streamed | Response respects my preferred language
- **Dependencies:** AI Credits; ai_gateway

**PG-046 · Get help in my language**  _( Highest / MVP · 3 pts )_

- As a student, I want to get explanations in Assamese or English, so that I learn in the language I think in.
- **Acceptance criteria:** Response delivered in preferred_language | Language is switchable per request
- **Dependencies:** AI Tutor base

**PG-047 · Request more examples**  _( High / Fast-Follow · 3 pts )_

- As a student, I want to ask for another example or a similar question, so that I can reinforce my understanding.
- **Acceptance criteria:** Tutor returns an additional example or generated similar question | Generated practice follows draft-only rules if persisted
- **Dependencies:** AI Question Generation

### PG-048 · Feature: Cost Metering

**PG-049 · Meter every tutor call**  _( Highest / MVP · 5 pts )_

- As a platform, I want to meter every AI tutor call against credits at the backend, so that AI margins are protected.
- **Acceptance criteria:** Reserve -> call -> commit/release on every request | No AI call proceeds without a successful credit reserve | Cache hits cost 0 credits | Requests are rate-limited; credits are never trusted from the client
- **Dependencies:** AI Credits ledger; ai_gateway

## PG-050 · EPIC: Adaptive Daily Practice

_A daily habit-forming practice set tailored to the learner._

### PG-051 · Feature: Daily Set Generation

**PG-052 · Get an adaptive daily set**  _( High / Fast-Follow · 8 pts )_

- As a student, I want to receive a daily set of 10-20 questions based on my weak topics, mistakes, trends and syllabus coverage, so that I build a daily habit and improve fastest.
- **Acceptance criteria:** Set generated daily via Celery | Inputs include weak topics, missed questions, recent mistakes, performance trends, syllabus coverage and exam date | Recommendations adapt continuously | Selection is exam-config-driven
- **Dependencies:** Result Analytics (weak topics); Exam Engine; Celery

**PG-053 · Start my daily set quickly**  _( High / Fast-Follow · 3 pts )_

- As a student, I want to get my daily set linked on the dashboard and via Telegram, so that I can start with one tap.
- **Acceptance criteria:** Daily link on dashboard and pushed via Telegram | Completion counts toward streak and daily goal
- **Dependencies:** Telegram Reminders; Daily Set Generation

## PG-054 · EPIC: Study Plans

_Personalized, trackable study roadmaps anchored to the exam date._

### PG-055 · Feature: Plan Generation

**PG-056 · Generate a study plan**  _( High / Fast-Follow · 5 pts )_

- As a student, I want to generate a personalized study plan from my exam date and available hours, so that I have a clear roadmap to exam day.
- **Acceptance criteria:** Inputs: target exam, exam date, hours per day | Output: dated plan with topic sequence, practice goals and mock schedule | Plan anchored to the exam countdown
- **Dependencies:** Exam config; Result Analytics

### PG-057 · Feature: Plan Tracking

**PG-058 · Track plan tasks**  _( High / Fast-Follow · 3 pts )_

- As a student, I want to check off and track my study-plan tasks, so that I stay accountable.
- **Acceptance criteria:** Plan items have status pending/done/skipped | Completion updates progress and feeds the dashboard
- **Dependencies:** Plan Generation

## PG-059 · EPIC: AI Credits & Cost Governance

_The ledger, allocation, purchase and margin controls behind all AI usage._

### PG-060 · Feature: Credit Ledger

**PG-061 · Maintain a credit ledger**  _( Highest / MVP · 5 pts )_

- As a platform, I want to track all AI consumption in an append-only, double-spend-safe ledger, so that AI usage is auditable and safe.
- **Acceptance criteria:** Append-only transactions (grant/reserve/commit/release/purchase/refund/reset) | Balance and reserved amounts tracked accurately | select_for_update prevents double-spend under concurrency | Amounts use NUMERIC, never float
- **Dependencies:** PostgreSQL; ai_gateway

**PG-062 · See my credit balance**  _( High / Fast-Follow · 2 pts )_

- As a user, I want to see my credit balance and consumption, so that I can manage my AI usage.
- **Acceptance criteria:** Balance and monthly consumption shown | Per-operation breakdown available
- **Dependencies:** Credit Ledger

### PG-063 · Feature: Allocation, Purchase & Margin

**PG-064 · Allocate & reset monthly credits**  _( High / Fast-Follow · 3 pts )_

- As a platform, I want to allocate plan credits and reset them on schedule, so that user entitlement is clear and predictable.
- **Acceptance criteria:** Allocation per plan applied | Monthly reset runs via Celery beat | Reset and grants recorded in the ledger
- **Dependencies:** Credit Ledger; Celery

**PG-065 · Buy additional credits**  _( High / Fast-Follow · 5 pts )_

- As a paid user or institution, I want to purchase additional credits via Razorpay, so that I can keep using AI features.
- **Acceptance criteria:** Razorpay checkout completes | Webhook signature verified before granting | Credits granted on success; idempotent on retries
- **Dependencies:** Razorpay; Credit Ledger

**PG-066 · Protect margins automatically**  _( High / Fast-Follow · 5 pts )_

- As a platform, I want to route or throttle AI when cost approaches plan economics, so that the business stays margin-positive.
- **Acceptance criteria:** Cost->credit map per (operation, model) | Threshold breach triggers cheaper routing and/or throttling | Margin ratio is monitored and alertable
- **Dependencies:** ai_gateway; Credit Ledger

## PG-067 · EPIC: Telegram Reminders & Engagement

_Telegram-first habit automation and community (before WhatsApp)._

### PG-068 · Feature: Bot Linking

**PG-069 · Link my Telegram**  _( Highest / MVP · 3 pts )_

- As a student, I want to link my Telegram account to the platform, so that I receive reminders and practice links where I already are.
- **Acceptance criteria:** Linking flow via the bot completes | Opt-in captured; chat id stored | Unlink / opt-out supported
- **Dependencies:** n8n

### PG-070 · Feature: Reminder Triggers

**PG-071 · Receive habit reminders**  _( Highest / MVP · 5 pts )_

- As a student, I want to receive reminders for inactivity, weak topics, streak-at-risk, scheduled mocks and weekly motivation, so that I stay consistent until exam day.
- **Acceptance criteria:** Triggers fire on conditions (24h inactive; accuracy < 50%; streak at risk; mock day; Sunday) | Messages are frequency-capped and respect opt-in | Sends are idempotent (no duplicates)
- **Dependencies:** n8n; Celery; Result Analytics

**PG-072 · Get practice links & summaries**  _( Highest / MVP · 3 pts )_

- As a student, I want to get my daily practice link and score summaries via Telegram, so that I can act immediately.
- **Acceptance criteria:** Daily practice link delivered | Score summary sent after mocks | Weekly performance report delivered
- **Dependencies:** Daily Practice; Result Analytics

## PG-073 · EPIC: Content Review Workflow

_Human review gate that keeps all content trustworthy; AI content is always Draft._

### PG-074 · Feature: Review Queue & State Machine

**PG-075 · Work a review queue**  _( Highest / MVP · 3 pts )_

- As a content reviewer, I want to see a queue of draft questions to review, so that I can review content efficiently.
- **Acceptance criteria:** Drafts from AI, manual and extraction listed | Filter by exam, origin and status | Reviewer can claim an item
- **Dependencies:** Question Bank; RBAC

**PG-076 · Review, edit, approve or reject**  _( Highest / MVP · 5 pts )_

- As a content reviewer, I want to edit, approve or reject a question with comments, so that quality is controlled before publish.
- **Acceptance criteria:** Transitions draft -> in_review -> approved/rejected enforced server-side | Rejection returns the item to draft with a reason | Every transition is logged
- **Dependencies:** Review Queue

**PG-077 · SME-validate hard items**  _( High / Fast-Follow · 3 pts )_

- As a SME, I want to validate difficult or exam-specific questions, so that accuracy and syllabus alignment are assured.
- **Acceptance criteria:** Flagged items route to sme_review | SME approve/reject recorded as an approval at the SME level
- **Dependencies:** Review Queue

### PG-078 · Feature: Publish & Audit

**PG-079 · Publish approved content**  _( Highest / MVP · 3 pts )_

- As a content manager, I want to publish approved questions, so that students can access trusted content.
- **Acceptance criteria:** Only approved items can be published | Official vs AI-generated content is visually distinguishable | Items that failed validation cannot be published
- **Dependencies:** Review state machine

**PG-080 · Audit all review actions**  _( Highest / MVP · 2 pts )_

- As a platform, I want to keep an immutable audit trail of review actions, so that we have accountability for content decisions.
- **Acceptance criteria:** who/when/from->to/reason recorded for every transition | Log is append-only
- **Dependencies:** Review state machine

### PG-081 · Feature: AI Generation

**PG-082 · Generate draft questions**  _( High / Fast-Follow · 8 pts )_

- As a content manager, I want to generate draft questions constrained by exam config, so that I can expand the bank efficiently without losing trust.
- **Acceptance criteria:** Generation follows syllabus, blueprint, topic & difficulty distribution and objectives | Output validated (schema, pgvector dedup, syllabus alignment) before becoming a Draft | Generated content is ALWAYS Draft and never auto-published | Generation is credit-charged via the ledger
- **Dependencies:** ai_gateway; AI Credits; Exam config

## PG-083 · EPIC: Institution Platform

_Multi-tenant coaching-centre product: dashboards, batch analytics, custom mocks, white-label and pooled credits._

### PG-084 · Feature: Onboarding & Batches

**PG-085 · Onboard institution & batches**  _( Medium / Post-MVP · 5 pts )_

- As a institution admin, I want to onboard my institution and create batches with students and teachers, so that I can organize my coaching centre.
- **Acceptance criteria:** Institution and batches created | Students and teachers added via memberships (single membership model with role) | All data is tenant-isolated by institution_id
- **Dependencies:** RBAC; Multi-tenancy

### PG-086 · Feature: Institution Dashboard

**PG-087 · View batch dashboard**  _( Medium / Post-MVP · 8 pts )_

- As a teacher, I want to see my batch's performance, weak students, attendance and practice completion, so that I can intervene where students need help.
- **Acceptance criteria:** Scoped strictly to my own batches | Shows performance, weak students, attendance and practice completion | No cross-tenant data is ever returned
- **Dependencies:** Onboarding & Batches; Result Analytics

### PG-088 · Feature: Institution Analytics

**PG-089 · View batch analytics**  _( Medium / Post-MVP · 8 pts )_

- As a teacher, I want to see topic-level performance, class trends and cohort comparison, so that I can target my teaching.
- **Acceptance criteria:** Topic-level performance and class trends shown | Cohort comparison supported | Reuses the analytics engine scoped by batch (no forked logic)
- **Dependencies:** Result Analytics; Institution Dashboard

### PG-090 · Feature: Custom Mocks & White-label

**PG-091 · Create custom mock tests**  _( Medium / Post-MVP · 5 pts )_

- As a teacher, I want to assemble custom mock tests from approved questions and assign them to my batch, so that I can assess on my own schedule.
- **Acceptance criteria:** Mocks assembled from approved questions only | Assigned to a batch; exam-config-aware
- **Dependencies:** Exam Engine; Content Review

**PG-092 · Apply white-label branding**  _( Medium / Post-MVP · 3 pts )_

- As a institution admin, I want to apply my institution's branding to the student experience, so that the experience reflects my brand.
- **Acceptance criteria:** Branding (logo/theme) applied at the frontend | Scoped per institution
- **Dependencies:** Onboarding & Batches

### PG-093 · Feature: Pooled Credits

**PG-094 · Manage pooled AI credits**  _( Medium / Post-MVP · 5 pts )_

- As a institution admin, I want to use pooled AI credits across my members and buy more, so that I control AI spend for my centre.
- **Acceptance criteria:** Single institution credit account | Member AI usage debits the pool | Additional credits purchasable via Razorpay | Usage dashboard available
- **Dependencies:** AI Credits ledger; Razorpay

## PG-095 · EPIC: Admin Portal

_Operations and configuration via Django Admin: exams, users, content, mocks and platform health._

### PG-096 · Feature: Exam Configuration

**PG-097 · Configure exams as data**  _( Highest / MVP · 8 pts )_

- As a platform admin, I want to configure exams (subjects, topics, subtopics, syllabus, difficulty, rules, blueprint, passing criteria, analytics rules) as data, so that new exams onboard without code changes.
- **Acceptance criteria:** Full exam-config CRUD available | Config drives the engines (no hardcoded exam logic) | audience_is_minor flag supported | Adding a new exam requires no deployment
- **Dependencies:** PostgreSQL; Django Admin

### PG-098 · Feature: Platform Management

**PG-099 · Manage users & roles**  _( Highest / MVP · 3 pts )_

- As a platform admin, I want to view, search, suspend and assign roles to users, so that I can operate the platform safely.
- **Acceptance criteria:** List/search users | Assign roles; suspend/reactivate | Actions are audited
- **Dependencies:** RBAC

**PG-100 · Manage content structure & mocks**  _( Highest / MVP · 3 pts )_

- As a platform admin, I want to manage subjects, topics, questions and mock tests via admin, so that content structure stays maintained.
- **Acceptance criteria:** CRUD on subjects/topics/questions/mocks via Django Admin | Respects review/publish rules
- **Dependencies:** Question Bank

**PG-101 · Oversee AI content & platform health**  _( High / Fast-Follow · 5 pts )_

- As a platform admin, I want to access the AI-content review queue and a platform analytics dashboard, so that I can oversee quality and health.
- **Acceptance criteria:** AI review queue accessible from admin | Platform KPIs shown (active users, attempts, conversion, AI cost)
- **Dependencies:** Content Review; Result Analytics; AI Credits
