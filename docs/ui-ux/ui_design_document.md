# PrepGenius AI — UI/UX Design Specification

**Derived from:** PRD v4 (+ SAD, claude_rules)
**Author role:** Senior Product Designer & UX Architect
**Stack:** Next.js (App Router) · Tailwind CSS · shadcn/ui · lucide-react · recharts
**Target users:** CTET candidates · Assam TET candidates · Coaching institutes
**Design goals:** Modern · Minimal · Mobile-first · Exam-focused · Fast · Low-bandwidth friendly
**Status:** v1.0

---

## 1. Design Principles

1. **Content first, chrome last.** Every screen earns its pixels by moving the student toward "exam ready." Decorative UI is cut.
2. **One primary action per screen.** A single, obvious next step (a filled primary button); everything else is secondary or tertiary.
3. **Thumb-first.** Primary actions sit in the lower third on mobile; navigation is a bottom tab bar; destructive/secondary actions live in bottom sheets.
4. **Focus is sacred in exam mode.** The mock interface strips all navigation, notifications, and color noise — it is a deliberately different visual world.
5. **Performance is a feature.** Skeletons over spinners, optimistic updates, offline resilience, and a JS-light critical path. The product must feel fast on a ₹6,000 Android phone on 3G.
6. **Assamese-first, not Assamese-also.** The default experience is Assamese; language is a first-class choice, never an afterthought.
7. **Trust through clarity.** Official vs AI-generated content, credit costs, and scoring are always explicit. No hidden mechanics.

---

## 2. Design System Foundations

### 2.1 Color (shadcn CSS variables, HSL)
A calm, trustworthy, focus-preserving palette. Indigo primary (confidence/focus), emerald for success/correct, amber for caution, rose for error/incorrect.

```css
:root {
  --background: 0 0% 100%;        --foreground: 222 22% 11%;
  --card: 0 0% 100%;              --muted: 220 14% 96%;     --muted-foreground: 220 9% 46%;
  --primary: 243 75% 59%;         --primary-foreground: 0 0% 100%;   /* indigo-600 */
  --secondary: 220 14% 96%;       --secondary-foreground: 222 22% 20%;
  --success: 158 64% 40%;         /* emerald-600 */
  --warning: 38 92% 50%;          /* amber-500  */
  --destructive: 350 78% 50%;     /* rose-600   */
  --border: 220 13% 91%;          --ring: 243 75% 59%;
  --radius: 0.625rem;
}
.dark { --background: 222 24% 9%; --foreground: 210 20% 96%; --muted: 222 16% 16%; /* … */ }
```
- **Light is default** (study contexts, daylight, low-end screens). Dark mode supported but secondary.
- Use semantic tokens, never raw hex in components (keeps theming + white-label per institution trivial).

### 2.2 Question-State System (reused by Mock Interface + Navigator)
Exam-critical and **colorblind-safe** — color is *never* the sole signal; each state also carries a shape/icon and the question number.

| State | Fill | Icon/shape | Notes |
|---|---|---|---|
| Not visited | `muted` (gray) | hollow square | default |
| Visited, unanswered | white + `warning` ring | open circle dot | started, not answered |
| Answered | `success` (emerald) | check ✓ | answer saved |
| Marked for review | `primary`→violet (`262 70% 55%`) | flag/bookmark | wants revisit |
| Answered + marked | violet fill + small emerald check badge | flag + ✓ | both |

### 2.3 Typography
- **Latin/UI:** Inter (variable, subset). **Hindi:** Noto Sans Devanagari. **Assamese (Bengali-Assamese script, incl. ৰ ৱ):** Noto Sans Bengali.
- One Noto-based multilingual stack for predictable rendering; `font-display: swap`; preload only Regular + SemiBold; system-font fallback for first paint on slow networks.
- **Scale (rem):** 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 1.875 / 2.25 with comfortable line-height (1.5 body, 1.2 headings). Body default 1rem (never below 0.875 for question text — readability on small screens).

### 2.4 Spacing, radius, elevation, motion, icons
- **Spacing:** 4px base (Tailwind scale). Section rhythm 16/24/32.
- **Radius:** `--radius` 10px; cards `rounded-xl`, controls `rounded-lg`.
- **Elevation:** minimal — one soft shadow for cards/sheets; flat surfaces elsewhere. No heavy drop shadows.
- **Motion:** 150–200ms ease; only for state changes and sheets. **Respect `prefers-reduced-motion`.**
- **Icons:** lucide-react, 20–24px, paired with text labels.

---

## 3. Responsive & Navigation System

- **Breakpoints (mobile-first):** base <640 · `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Design at 360–390px first.
- **Student navigation:**
  - *Mobile:* fixed **bottom tab bar** — Home · Practice · Analytics · Tutor · Profile (5 max, thumb zone).
  - *Desktop (`lg+`):* collapsible **left sidebar** + slim top bar (language switcher, credits, avatar).
- **Institution/Admin navigation:** left sidebar (sectioned), data-dense top bar with search (`Command` palette).
- **Containers:** content max-width `~720px` for reading flows, `~1200px` for dashboards; generous gutters on mobile (16px).

---

## 4. Performance & Low-Bandwidth Strategy

- **Skeletons, not spinners**, for every async surface; render shell instantly (RSC), hydrate progressively.
- **Code-split per feature**; lazy-load Tutor, charts (recharts), and the mock player.
- **Image-light:** SVG/icon-first; landing illustrations as optimized SVG; `next/image` with responsive sizes and AVIF/WebP only where photos are unavoidable.
- **Optimistic UI** for answer selection, marking, daily-practice completion.
- **Offline-resilient mock** (per SAD): answers buffer in IndexedDB and sync; visible save state.
- **Data discipline:** cursor-paginated lists, server-computed aggregates (no heavy client math — frontend holds *no business logic*).
- Perf budget target: interactive < 3s on mid-tier Android/3G; JS on critical path minimized.

---

## 5. Internationalization (Assamese-first)

- Default locale **Assamese (`as`)**; switch to Hindi/English from top bar and onboarding. Persisted to profile.
- All copy externalized (`next-intl`); never hardcode strings. Tutor responses render in `preferred_language`.
- Mixed-script lines (e.g., subject names + numerals) tested for baseline alignment; avoid clipping of Bengali-Assamese conjuncts (sufficient line-height).

---

## 6. Accessibility (WCAG 2.1 AA)

- Contrast ≥ 4.5:1 (text), ≥ 3:1 (UI/large). Question-state never color-only (§2.2).
- Touch targets ≥ 44×44px. Visible focus rings (`--ring`). Full keyboard nav incl. mock navigator.
- Semantic landmarks + ARIA labels; live-region announcements for timer warnings, autosave, and toasts.
- Honor reduced motion and respect OS font-scaling.

---

## 7. Core Component Inventory (shadcn/ui)

Button · Card · Input · Label · Select · Tabs · Dialog · **Sheet** (mobile bottom sheets) · Drawer · Progress · Badge · Avatar · Sonner (toasts) · Skeleton · Table · DataTable · Command · Tooltip · Accordion · Calendar · Popover · Separator · ScrollArea · Chart wrappers (recharts). Custom: `QuestionTile`, `Timer`, `StateLegend`, `CreditMeter`, `ReadinessGauge`, `WeakTopicCard`, `SaveStatus`.

---

# 8. Screen Specifications

> Each screen: **Purpose · Layout · Components · User Flow · Mobile · Desktop · UX Considerations.**

---

## 8.1 Landing Page
**Purpose.** Convert a regional aspirant in seconds: communicate "best Assam TET / CTET practice in your language," and drive to Register.
**Layout.** Lightweight top bar (logo, language switch, Login). Hero: one-line value prop + subline + primary CTA "Start free" + secondary "See how it works." Below: 3 benefit cards (Practice in Assamese · Find weak topics · AI explanations), social proof / exam logos, pricing teaser (Free / Season Pass), footer.
**Components.** Button, Card, Badge, Accordion (FAQ), Separator, language Select.
**User Flow.** Land → pick language (or default Assamese) → tap "Start free" → Registration.
```
[ logo            🌐 as ▾   Login ]
┌──────────────────────────────┐
│  Crack [Assam TET] in Assamese│
│  Find weak topics. Fix them.  │
│  [ Start free ]  [ How it works ]│
└──────────────────────────────┘
[●Assamese] [●Weak-topic AI] [●Mocks]
```
**Mobile.** Single column, hero CTA above the fold, sticky "Start free" on scroll. No autoplay media.
**Desktop.** Two-column hero (copy left, product preview right as SVG), 3-up benefit grid.
**UX.** Above-the-fold CTA; copy in Assamese first; no heavy hero image (low bandwidth); load < 2s.

## 8.2 Registration
**Purpose.** Frictionless signup with the minimum fields + consent.
**Layout.** Centered card. Fields: full name, email, mobile, password; preferred language (defaulted), target exam (Select), exam date (optional). Consent checkbox (DPDP) with link. Primary "Create account." Link to Login.
**Components.** Card, Input, Label, Select, Calendar (exam date), Checkbox, Button, inline validation, Sonner.
**User Flow.** Fill → consent → submit → OTP/email verify screen → Dashboard (onboarding hint).
**Mobile.** Full-width fields, large tap targets, numeric keyboard for mobile field, sticky submit.
**Desktop.** Centered 420px card; optional value-prop panel on the right.
**UX.** Progressive disclosure (exam date optional, collapsible); real-time validation with helpful errors; password strength; minors → surface parental-consent path; never block on email verify for free browsing, block only paid/AI features.

## 8.3 Login
**Purpose.** Fast, secure return.
**Layout.** Centered card: email/mobile, password, "Forgot password?", primary "Log in," link to Register.
**Components.** Card, Input, Button, Checkbox (remember device), Sonner.
**User Flow.** Submit → (rate-limited) → Dashboard; failure → inline error; forgot → reset flow.
**Mobile.** Single column, autofill-friendly, show/hide password toggle.
**Desktop.** Centered card.
**UX.** No field-specific failure hints (security); lockout messaging after repeated attempts; httpOnly-cookie session (no token UI).

## 8.4 Dashboard (Student Home)
**Purpose.** Daily launchpad: where am I, what's next, days left.
**Layout.** Greeting + **days-to-exam** chip. Row of stat cards (Streak · Accuracy · Questions attempted · Today's goal progress). "Continue / Start daily practice" primary card. Weak-topics strip (horizontal scroll). Upcoming mocks. Subject performance mini-bars.
**Components.** Card, Progress (goal ring), Badge, Button, horizontal ScrollArea, mini recharts bar, Skeleton.
**User Flow.** Home → tap "Daily practice" → Daily Practice; tap a weak topic → topic practice; tap mock → Exam Selection/Mock.
```
Good morning 👋        ⏳ 42 days to exam
[🔥 12]  [🎯 68%]  [Σ 540]  [Goal 7/15 ●●●○○]
┌ Today's set ready — 15 Q ───── [ Start ] ┐
Weak: [Inclusive Edu 42%][Assessment 35%] →
Upcoming mock · CTET Full · Sat
```
**Mobile.** Vertical stack; stat cards 2×2 grid; bottom tab bar. Goal ring prominent.
**Desktop.** 12-col: left main (daily + weak + mocks), right rail (streak, readiness teaser).
**UX.** One clear next action (daily practice); countdown creates urgency; everything tappable routes to a session; all numbers server-computed.

## 8.5 Question Bank (Browse / Practice by content)
**Purpose.** Let students explore and start practice scoped by subject/topic/subtopic/difficulty (published content only).
**Layout.** Top: exam context + search + filter bar (Subject, Topic, Difficulty, Language, Source/Year, "Previous-year only"). List of topics with counts and accuracy badge; tapping a topic opens subtopic drill-in or "Practice N questions."
**Components.** Command/Input (search), Select/Combobox filters, Accordion (subject→topic→subtopic), Badge (counts, official/AI), Button, Skeleton, empty state.
**User Flow.** Filter → pick topic → "Practice 10" → Mock/Practice player.
**Mobile.** Filters in a **bottom Sheet** ("Filters" button shows active count); list is single column; sticky "Practice selected."
**Desktop.** Left filter rail + main list; multi-select topics to compose a custom set.
**UX.** Show only published; mark official vs AI-generated with a Badge; show personal accuracy per topic to nudge weak areas; debounce search; preserve filters.

## 8.6 Exam Selection
**Purpose.** Choose what to attempt: practice mode or a specific mock/PYP, scoped to exam.
**Layout.** Exam switcher (if multiple). Mode cards: Topic Practice · Subject Practice · Mixed · Previous-Year Paper · Full Mock. For mocks/PYP: list with year, duration, question count, attempted-badge, "Start."
**Components.** Tabs/Segmented (modes), Card grid, Badge (duration, Q count, "Attempted"), Button, Select (exam), Skeleton.
**User Flow.** Pick exam → pick mode → (configure scope if practice) → pre-start dialog (rules/duration) → Mock Interface.
**Mobile.** Mode as a vertical card list; mock list below; pre-start confirmation as bottom Sheet.
**Desktop.** Modes as a 5-up segmented row; mock list as a table/cards.
**UX.** Always show duration + question count + marking scheme *before* start (from exam config); pre-start dialog confirms full-screen and timing; resume in-progress attempts surfaced at top.

## 8.7 Mock Test Interface  ★
**Purpose.** Distraction-free, reliable, exam-realistic test-taking. The product's most important screen.
**Layout.** Minimal exam chrome: top bar = section tabs + **server-authoritative Timer** + **SaveStatus** + Submit. Center = question (stem, options as large radio tiles, optional figure). Bottom (mobile) = Prev · Mark for review · Save & Next; a "Palette" button opens the Navigator sheet.
**Components.** Custom `Timer`, `SaveStatus` (saved/saving/offline-queued), radio option tiles, Button, Sheet (navigator), Badge (section), Dialog (submit confirm + auto-submit warning), Progress (answered/total).
**User Flow.** Start → answer/mark/navigate → autosave each change → time/area warnings → manual or auto Submit → Result.
```
[CDP | Sci | Eng]   ⏱ 1:58:42   ✓ saved   [Submit]
Q12.  Which best describes …
 (A) ▢ …    (B) ▣ …    (C) ▢ …    (D) ▢ …
[ ‹ Prev ]   [ ⚑ Mark ]   [ Save & Next › ]
                                   [ ⊞ Palette ]
```
**Mobile.** Full-screen, no bottom tab bar; one question per view; bottom action cluster in thumb zone; Navigator as a bottom Sheet; large 44px+ option tiles.
**Desktop.** Two-pane: question center, **persistent Navigator** on the right (no sheet needed); timer pinned top-right.
**UX.** **Timer is display-only of server-computed remaining time** (per SAD) — never client-authoritative; visible **autosave state** and offline-queued indicator reassure on flaky networks; option tiles are whole-row tappable; "Submit" always confirms with answered/unanswered counts; auto-submit at 0:00 with a 60s live-region warning; prevent accidental back-navigation; honor reduced motion (no flashy transitions mid-exam).

## 8.8 Question Navigator (Palette)
**Purpose.** Spatial overview of all questions and one-tap jumping; the at-a-glance state map.
**Layout.** Grid of numbered `QuestionTile`s colored/iconed by state (§2.2), grouped by section (Tabs). A persistent **StateLegend**. Summary counts (Answered / Marked / Not visited). "Jump to first unanswered."
**Components.** `QuestionTile` grid, Tabs (sections), `StateLegend`, Badge counts, Button, ScrollArea, Sheet (mobile container).
**User Flow.** Open palette → scan states → tap a number → jump to it → continue.
```
Answered 8 · Marked 2 · Not visited 5     [Legend ▾]
CDP: ①✓ ②✓ ③○ ④⚑ ⑤✓ ⑥▢ …
Sci: ⑦✓ ⑧✓ ⑨▢ …                [ Jump to unanswered ]
```
**Mobile.** Bottom **Sheet** (~70% height), scrollable grid, legend pinned at top; closes back to current question.
**Desktop.** Docked right panel always visible alongside the question.
**UX.** State must read without color (icon + number); generous tile size for thumbs; legend always reachable; keyboard-navigable; counts update live as the student answers/marks.

## 8.9 Result Page
**Purpose.** Immediate, honest outcome framed against the pass line, with a clear next step.
**Layout.** Hero score (big number) + pass/needs-work status vs section cutoffs. Quick stats (Correct/Incorrect/Skipped/Accuracy/Time). Section breakdown bars. Per-question review list (correct/your-answer, "Ask tutor" on each). CTA: "Practice weak topics" / "View analytics."
**Components.** Card, big stat, Progress/bars, Badge (pass/fail per section), Accordion (question review), Button, recharts (section bars), "Ask AI" link per question.
**User Flow.** Submit → Result → review a question → AI Tutor (deep link) OR → weak-topic practice.
**Mobile.** Score hero first; collapsible section breakdown; review list paginated; sticky "Practice weak topics."
**Desktop.** Two-column: summary + chart left, scrollable review right.
**UX.** Frame against **pass line**, not just raw % (PRD); make "what to do next" the prominent action; each wrong question offers one-tap Tutor (credit cost shown); avoid celebratory tone when below cutoff — supportive, actionable.

## 8.10 Analytics Dashboard
**Purpose.** Show trends and where to focus over time.
**Layout.** Top filters (exam, time window 7/30/90). KPI cards (accuracy trend, attempts, avg time/Q). Trend line chart. Subject radar/bars. Topic accuracy table (sortable). Time-management panel (fastest/slowest subject). Readiness teaser → §8.11/score.
**Components.** Select (window), Card KPIs, recharts (line, bar, radar), DataTable (topics), Badge, Skeleton.
**User Flow.** Open → choose window → drill a subject → topic list → start targeted practice.
**Mobile.** Stacked: KPI cards (2×2) → one chart at a time (swipe Tabs) → topic table as cards.
**Desktop.** Grid: KPIs row, charts 2-up, full topic table.
**UX.** Charts lazy-loaded; one chart visible at a time on mobile (perf + focus); every insight links to an action ("Practice this topic"); numbers from server aggregates.

## 8.11 Weak Topic Dashboard
**Purpose.** The remediation hub — turn "you're weak here" into "do this now."
**Layout.** Header with overall readiness. List of `WeakTopicCard`s sorted by severity: topic, accuracy, trend arrow, status (active/improving/resolved), "Practice 5" + "Explain with AI." Filter by subject/status.
**Components.** `WeakTopicCard`, Badge (severity/status), Progress, Button, Select filter, empty/celebration state when resolved.
**User Flow.** Open → pick weakest → "Practice 5" → session → return with updated status.
**Mobile.** Single-column cards; primary "Practice" on each; severity color + label.
**Desktop.** Two-column card grid + a side summary (count by severity).
**UX.** Sort by impact (severity × frequency); show movement (improving) for motivation; "resolved" gives a small win; remediation is one tap; never shame — framing is growth-oriented.

## 8.12 AI Tutor Interface
**Purpose.** Conversational, multilingual concept help anchored to a question — within credit budget.
**Layout.** Chat thread (student/AI bubbles, streaming). Context chip (the question it's about). Quick-action chips: "Why is B correct?" · "Explain simpler" · "In Assamese" · "Another example" · "Similar question." Composer with send. Persistent **CreditMeter** (cost per ask + balance).
**Components.** Chat bubbles, streaming text, suggestion Chips, Input/Composer, `CreditMeter` Badge, Sheet (when launched over a question), Sonner (low-credit warning).
**User Flow.** From Result/practice "Ask AI" → tutor opens with question context → tap a chip or type → streamed answer → follow-up; if low credits → upsell/top-up.
**Mobile.** Full-screen chat; context chip pinned top; quick-action chips above composer; composer docked above keyboard.
**Desktop.** Right-docked panel beside the question, or full page from nav.
**UX.** **Cost transparency** — show credits a request will cost *before* sending; language toggle one tap; stream responses for perceived speed; cache common explanations (free/instant); graceful low-credit state with top-up CTA; never expose model/provider details.

## 8.13 Daily Practice Screen
**Purpose.** The habit loop — a quick, tailored daily set that counts toward streak/goal.
**Layout.** Header: "Today's set · 15 Q · ~12 min" + why ("Focused on: Inclusive Education, Assessment"). Big "Start" card. After completion: result mini-summary + streak increment animation + "Tomorrow's set unlocks at midnight."
**Components.** Card, Progress, Badge (topics targeted), Button, streak `🔥` animation (reduced-motion aware), reuses Mock player for the session.
**User Flow.** Dashboard/Telegram link → Daily Practice → Start → player → mini-result → streak update → back to Home.
**Mobile.** One-tap start; minimal pre-amble; completion celebrates streak.
**Desktop.** Same, centered; shows weekly streak calendar.
**UX.** Fast to start (≤1 tap from Home or Telegram); explain *why* these questions (transparency builds trust in personalization); reinforce streak without being manipulative; deep-link safe from Telegram.

## 8.14 Study Plan Screen
**Purpose.** A dated, trackable roadmap to exam day.
**Layout.** Generation form (exam, exam date, hours/day) → generated plan as a **timeline/calendar**: per-day topics, practice goals, scheduled mocks. Today highlighted. Checkable tasks; progress header.
**Components.** Form (Select, Calendar, Slider for hours), timeline list / Calendar, Checkbox tasks, Progress, Badge (task type), Accordion (week groups).
**User Flow.** First visit → fill inputs → generate → review plan → check off tasks daily → adjust.
**Mobile.** Agenda view (today + upcoming list); tap a day to expand; check tasks inline.
**Desktop.** Calendar/month + day detail side panel.
**UX.** Anchor everything to the countdown; "Today" always reachable; allow regenerate if exam date/hours change; tasks link directly into practice; keep it realistic (show if plan exceeds available days and suggest trims).

## 8.15 Institution Dashboard (Institution Admin)
**Purpose.** Run a coaching centre: batches, members, pooled credits, branding.
**Layout.** Sidebar (Overview · Batches · Members · Credits · Branding · Mocks). Overview: KPI cards (active students, batches, avg readiness, credit balance). Batch list with quick stats. Quick actions (create batch, invite, buy credits).
**Components.** Sidebar, DataTable (batches/members), Card KPIs, `CreditMeter` (pooled), Button, Dialog (invite/create), Tabs.
**User Flow.** Admin logs in → overview → manage batches/members → monitor pooled credits → buy more (Razorpay) → set branding.
**Mobile.** Collapsible sidebar → hamburger; KPI cards stacked; tables become cards; key actions in a Sheet. (Admin is desktop-leaning but must work on mobile.)
**Desktop.** Full sidebar + data-dense tables + KPI grid.
**UX.** Strictly tenant-scoped (no cross-institution data); pooled-credit balance and burn rate prominent (cost control); white-label preview when editing branding; bulk member import.

## 8.16 Teacher Dashboard
**Purpose.** A teacher's view of their batches: who's struggling, who's active.
**Layout.** Batch switcher. KPI row (avg accuracy, practice completion, attendance, at-risk count). "Weak students" list (sorted by risk). Class topic-heatmap. Quick actions: create custom mock, message batch.
**Components.** Select (batch), Card KPIs, DataTable (students with sparkline), heatmap (recharts), Badge (at-risk), Button.
**User Flow.** Teacher → pick batch → scan at-risk students → open a student (§8.17) → assign a custom mock.
**Mobile.** Batch switcher top; at-risk students as cards; heatmap as scrollable; assign-mock via Sheet.
**Desktop.** KPI row + student table + heatmap side-by-side.
**UX.** Surface at-risk students first (action over data); scoped to own batches only; completion + attendance answer "is my batch engaged?"; one-tap drill to a student.

## 8.17 Student Analytics (Teacher viewing a student)
**Purpose.** Deep view of one student's progress for targeted intervention.
**Layout.** Student header (name, batch, readiness). Trend charts (accuracy over time), subject/topic breakdown, weak topics, recent attempts list, time analytics. "Recommend practice" / "Note."
**Components.** Card, recharts (line/bar), DataTable (attempts), `WeakTopicCard`, Badge, Button.
**User Flow.** Teacher dashboard → student → review → recommend/assign → track change.
**Mobile.** Stacked sections; charts one-at-a-time; attempts as cards.
**Desktop.** Two-column: trends/readiness left, weak topics + attempts right.
**UX.** Mirror the student's own analytics for consistency; tenant + batch scoped; readiness framed vs pass line; respect that this is a minor's data where applicable (no sensitive over-exposure).

## 8.18 Content Review Portal
**Purpose.** The human trust gate — review draft questions (manual/AI/extracted) through the state machine.
**Layout.** Left: review **queue** with filters (exam, origin official/AI/manual, status). Center: question detail (stem, options with correct flagged, explanation, syllabus tags, dedup candidates). Right: actions (Approve · Request SME · Reject + reason · Edit) + review history. Origin and status Badges everywhere.
**Components.** DataTable/list (queue), Card (detail), Badge (origin/status), Textarea (reject reason), Button group (transitions), diff/edit view, Accordion (dedup candidates + similarity), audit timeline.
**User Flow.** Reviewer claims item → reviews → edit/approve/reject (or route to SME) → SME validates hard items → Content Manager publishes.
**Mobile.** Functional but desktop-primary: queue → detail (full screen) → actions in a bottom Sheet.
**Desktop.** Three-pane (queue · detail · actions) for fast throughput.
**UX.** **AI vs official always distinguishable** (Badge + color); dedup candidates shown with similarity so nothing is auto-merged; reject requires a reason; every action logged and visible (accountability); never a "publish" path for failed-validation items; keyboard shortcuts for high-volume reviewing.

## 8.19 Admin Dashboard (Platform Admin)
**Purpose.** Operate and configure the platform — exams-as-data, users, content, health. (Django Admin-backed per rules; this is the product-facing summary layer.)
**Layout.** Sidebar (Exams · Users · Content · Mocks · AI Review · Analytics). Health overview: platform KPIs (active users, attempts, conversion, **AI cost / margin ratio**). Exam configuration entry. User management table. Links into review queue.
**Components.** Sidebar, Card KPIs, DataTable (users, exams), recharts (usage, AI cost), Command palette (jump-to), Button, Dialog.
**User Flow.** Admin → monitor health → configure an exam (subjects/topics/blueprint/passing criteria/analytics rules) → manage users/roles → oversee AI review.
**Mobile.** Read-mostly KPIs; heavy config defers to desktop/Django Admin.
**Desktop.** Dense dashboard + tables; exam config as structured forms (config-as-data, no code).
**UX.** Foreground the **AI cost / margin ratio** (business-critical); exam config presented as data forms (adding an exam needs no deploy); destructive actions confirmed + audited; fast search via Command palette.

## 8.20 AI Credit Usage Screen
**Purpose.** Transparent view of credit balance, consumption, and top-up — for individuals and institutions (pooled).
**Layout.** Hero: current balance + monthly allowance + reset date (`CreditMeter` large). Consumption breakdown by operation (Tutor / Explanation / Doubt / Generation) as a chart. Recent transactions list. CTA: "Buy more credits" (Razorpay). For institutions: pooled balance + per-member burn.
**Components.** `CreditMeter` (large), recharts (donut by operation, line by day), DataTable (transactions), Button (top-up → Razorpay), Badge, Skeleton.
**User Flow.** Profile/low-credit toast → Credit Usage → review consumption → "Buy more" → Razorpay → balance updates.
**Mobile.** Balance hero first; donut; transactions as cards; sticky "Buy credits."
**Desktop.** Balance + charts row; full transactions table; institution view adds member burn table.
**UX.** Make spend legible (where credits go) to build trust and reduce surprise; clear reset date; low-balance state with calm top-up CTA (not alarmist); institution pooled view shows burn rate; all values from the backend ledger (frontend never computes credits).

---

## Appendix A — Screen → PRD v4 mapping
Landing/Register/Login → §10.1 (Auth) · Dashboard → §10.2 · Question Bank → §10.3 · Exam Selection/Mock/Navigator → §10.5 · Result/Analytics → §10.6, §11 · Weak Topics → §4.2, §11 · AI Tutor → §10.7, §13 · Daily Practice → §10.2 adaptive · Study Plan → §10.10 · Institution/Teacher/Student Analytics → §12 · Content Review → §12 · Admin → §19, §13 · AI Credit Usage → §5.2, §13.

## Appendix B — Design tokens & component handoff
Ship tokens as shadcn CSS variables (§2.1) so per-institution white-label is a token swap. Build the custom components (`QuestionTile`, `Timer`, `SaveStatus`, `CreditMeter`, `ReadinessGauge`, `WeakTopicCard`, `StateLegend`) as a small internal library on top of shadcn primitives. Reminder (per claude_rules): the frontend renders state the server computes — no scoring, credit, or eligibility logic in the client.
