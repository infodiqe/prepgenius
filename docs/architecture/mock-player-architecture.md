# PrepGenius Mock Player — Architecture Document

**Document type:** Principal Engineer Architecture Review  
**Status:** Draft v1.0 — For review before implementation begins  
**Author role:** Principal Frontend Architect / Senior Staff Engineer  
**Date:** 2026-06-02  
**Backend sprint freeze:** Sprint 4 (frozen — no backend changes permitted)  
**Derived from:** PRD v4 · System Architecture Document v1.0 · UI/UX Design Specification v1.0 · Database Design v1.0 · Frozen OpenAPI Schema

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Functional Requirements](#2-functional-requirements)
3. [Player State Model](#3-player-state-model)
4. [Question State Machine](#4-question-state-machine)
5. [Save Status State Machine](#5-save-status-state-machine)
6. [Timer Synchronization Architecture](#6-timer-synchronization-architecture)
7. [Offline Queue Architecture](#7-offline-queue-architecture)
8. [IndexedDB Strategy](#8-indexeddb-strategy)
9. [API Contract Mapping](#9-api-contract-mapping)
10. [Navigation Architecture](#10-navigation-architecture)
11. [Submit Workflow](#11-submit-workflow)
12. [Failure Recovery](#12-failure-recovery)
13. [Component Hierarchy](#13-component-hierarchy)
14. [Mobile UX Specification](#14-mobile-ux-specification)
15. [Desktop UX Specification](#15-desktop-ux-specification)
16. [Accessibility Requirements](#16-accessibility-requirements)
17. [Performance Targets](#17-performance-targets)
18. [Security Considerations](#18-security-considerations)
19. [Risk Assessment](#19-risk-assessment)
20. [Open Questions](#20-open-questions)

---

## 1. Executive Summary

### 1.1 Purpose

The Mock Player is the most critical interactive surface in PrepGenius. It is the screen where a student takes a practice session or full-length mock exam. Every other module — analytics, weak-topic detection, readiness scoring, AI tutor — derives its value from the quality and reliability of data produced here. A wrong answer or a lost session destroys trust. A laggy or broken UI costs a student exam marks.

This document is the authoritative blueprint for building the Mock Player at `/practice/[attemptId]`. It covers state, data flow, API contracts, failure recovery, offline resilience, timer synchronization, security invariants, and component architecture. A senior engineer must be able to implement the player from this document alone, without additional design work.

### 1.2 Responsibilities

The Mock Player is responsible for:

- Loading an existing `ExamAttempt` (in any resumable state) and presenting its questions
- Displaying one question at a time with answer options
- Accepting and persisting answer selections and review flags in real time
- Maintaining a server-authoritative countdown timer rendered client-side
- Providing a Question Navigator (palette) showing all question states at a glance
- Auto-saving every interaction with idempotent writes and offline buffering
- Detecting network loss, buffering writes to IndexedDB, and flushing on reconnect
- Recovering cleanly from page refresh, browser crash, and tab restore
- Presenting a pre-submit confirmation dialog with unanswered counts
- Submitting the attempt and immediately triggering scoring
- Redirecting to the Results page upon successful score

### 1.3 Non-Responsibilities

The Mock Player must **never**:

- Compute, evaluate, or display scores, correctness, or explanations **during** an active attempt
- Store correct answers, `is_correct` flags, or explanations in any client-side store (React state, IndexedDB, TanStack Query, localStorage, sessionStorage)
- Act as the authoritative source of time — it only displays what the server encodes
- Alter the `started_at`, `duration_seconds`, or scoring of an attempt
- Load questions that are not published (`review_status ≠ 'published'`)
- Implement scoring logic — it calls the backend score endpoint and renders the result
- Manage credits — AI Tutor credit metering is outside the player scope

### 1.4 Architectural Principles

These principles, drawn from PRD v4 and the System Architecture Document, govern every design decision in this document:

1. **Server is authoritative for time.** The client renders a countdown; the server computes and enforces it. `Date.now()` is display-only.
2. **Answers must never be lost.** Network failures buffer to IndexedDB; writes are idempotent; the server is the source of truth on reconnect.
3. **No correctness data on the client during an active attempt.** Answer integrity is the product's trust foundation.
4. **Mobile-first, then desktop.** Design at 360px; progressive enhancement to 1280px+.
5. **Assamese-first.** All strings externalized via `next-intl`; layout must accommodate longer Assamese text.
6. **Performance is a feature.** Target interactive under 3 seconds on mid-tier Android over 3G.
7. **The frontend renders; the backend decides.** No scoring, no credit math, no eligibility logic in client code.

---

## 2. Functional Requirements

### 2.1 Capability Matrix

| Capability | MVP | Future Enhancement |
|---|---|---|
| Load and resume an attempt | ✅ | — |
| Display questions with 4-option MCQ | ✅ | Multi-correct, fill-in-the-blank |
| Save answer (single, idempotent) | ✅ | — |
| Mark for review | ✅ | — |
| Clear response | ✅ | — |
| Question Palette (navigator) | ✅ | — |
| Server-authoritative countdown timer | ✅ | — |
| Auto-save on every interaction | ✅ | — |
| Offline queue with IndexedDB buffer | ✅ | — |
| Recovery after page refresh | ✅ | — |
| Pre-submit confirmation dialog | ✅ | — |
| Manual submit | ✅ | — |
| Auto-submit on timer expiry | ✅ | — |
| Redirect to Results on score | ✅ | — |
| Section-based navigation (CDP / Science / etc.) | ✅ | — |
| Bulk-save on submit | ✅ | — |
| Keyboard navigation in palette | ✅ | — |
| Full-screen mode prompt | ✅ | Enforced lock |
| Question figures / images | ❌ | v2 |
| Multi-language question stem toggle | ❌ | v2 |
| Flashcard / explanation overlay during practice | ❌ | Post-submit only |
| Time-per-question analytics display | ❌ | v2 |
| Custom font scaling | ❌ | v2 |

### 2.2 User Stories

**US-01 — Load Attempt**  
*As a student, when I arrive at `/practice/{attemptId}` after the Rules Dialog, I want the player to load my exam session within 2 seconds, showing the first unanswered question, so I can start without delay.*

**US-02 — Resume Attempt**  
*As a student, if I close my browser mid-exam and return, I want the player to restore my progress — answers, review flags, and timer position — without any lost data, so I can continue where I left off.*

**US-03 — Answer a Question**  
*As a student, when I tap an option, I want it to be visually selected immediately (optimistic) and saved to the server within 1 second, so I can trust my choice is recorded.*

**US-04 — Mark for Review**  
*As a student, I want to flag a question I want to revisit, so I can answer it later without forgetting about it.*

**US-05 — Clear Response**  
*As a student, I want to deselect my answer and revert to "visited" state, so I can reconsider without accidental submission.*

**US-06 — Navigate via Palette**  
*As a student, I want to see all questions in a colour-coded grid at a glance, understand which are answered/marked/unanswered, and jump directly to any question by tapping its number.*

**US-07 — Autosave Indicator**  
*As a student on a spotty connection, I want to see whether my answers are saved, saving, or queued offline, so I am never anxious about data loss.*

**US-08 — Timer Awareness**  
*As a student, I want to see the remaining time, get a 5-minute warning, and know the timer is reliable even if I navigate away and return, so I can manage my pace.*

**US-09 — Submit Intentionally**  
*As a student, when I choose to submit, I want a confirmation step that shows me how many questions are unanswered and marked, so I make an informed decision before submitting.*

**US-10 — Auto-Submit**  
*As a student, when the timer reaches zero, I want the attempt to be automatically submitted so I don't lose credit for answered questions.*

**US-11 — See Results Immediately**  
*As a student, after submission I want to be taken to my results within 3 seconds, so I get immediate feedback.*

---

## 3. Player State Model

### 3.1 Canonical State Type

```
PlayerState {
  // ── Attempt metadata (from server) ──────────────────────────────────────
  attemptId:         string           // UUID; immutable for session lifetime
  examId:            string           // UUID; for question fetching
  mockTestId:        string | null    // UUID; null for practice-type attempts
  attemptType:       AttemptType      // 'topic' | 'subject' | 'mixed' | 'previous_year' | 'full_mock'
  attemptStatus:     AttemptStatus    // 'created' | 'in_progress' | 'submitted' | 'scored'
  totalQuestions:    number           // from server; used for palette grid
  durationSeconds:   number           // server-set; never overridden client-side
  startedAt:         string | null    // ISO timestamp from server; the timer anchor

  // ── Timer (derived from server data; never set directly) ─────────────────
  remainingSeconds:  number           // computed: (startedAt + durationSeconds) - Date.now()
  timerExpired:      boolean          // true when remainingSeconds <= 0

  // ── Question list ────────────────────────────────────────────────────────
  questions:         QuestionSlot[]   // ordered array; see §3.2
  currentIndex:      number           // 0-based; pointer into questions[]

  // ── Answer map (client copy; server is authoritative) ───────────────────
  answers:           Map<questionId, LocalAnswer>  // see §3.3

  // ── UI state ─────────────────────────────────────────────────────────────
  saveStatus:        SaveStatus       // 'idle' | 'saving' | 'saved' | 'queued' | 'failed'
  paletteOpen:       boolean          // mobile sheet / desktop panel visibility
  submitDialogOpen:  boolean          // pre-submit confirmation dialog
  isSubmitting:      boolean          // prevents duplicate submit clicks

  // ── Recovery ─────────────────────────────────────────────────────────────
  lastServerSync:    number           // Unix ms; timestamp of last successful server read
  offlineQueueSize:  number           // number of answers pending flush
}
```

### 3.2 QuestionSlot

```
QuestionSlot {
  id:              string           // question UUID
  position:        number           // 1-based ordinal from mock_test_questions.position
  section:         string | null    // e.g. "CDP", "Science" (null for mixed practice)
  stem:            string           // question text
  options:         QuestionOption[] // [{id, label, body, position}]
  // is_correct is NEVER present in this type. The backend's PublishedQuestion
  // serializer exposes is_correct on options; it MUST NOT be stored in this slot.
  // See §18 (Security) and §8 (IndexedDB) for the enforcement boundary.
}
```

### 3.3 LocalAnswer

```
LocalAnswer {
  questionId:        string           // foreign key to QuestionSlot.id
  selectedOptionId:  string | null    // null = cleared / not selected
  state:             QuestionState    // 'not_visited' | 'visited' | 'answered' | 'marked' | 'answered_marked'
  timeSpentSeconds:  number           // accumulated; server receives this on save
  dirty:             boolean          // true if not yet acknowledged by server
  lastModifiedAt:    number           // Unix ms; used for queue ordering
}
```

### 3.4 State Ownership Table

| State field | Owner | Lifecycle | Persistence |
|---|---|---|---|
| `attemptId`, `examId`, `mockTestId` | Server | Set on attempt create; immutable | TanStack Query / IndexedDB metadata |
| `attemptStatus`, `startedAt`, `durationSeconds`, `totalQuestions` | Server | Set on start; only server can advance status | TanStack Query (fresh on load/resume) |
| `questions[]` (stem, options, position, section) | Server | Loaded once on session open; immutable | TanStack Query (stale-time: session) |
| `remainingSeconds`, `timerExpired` | Derived (client) | Recomputed from `startedAt + durationSeconds` on every tick | Never persisted |
| `answers` (selectedOptionId, state, timeSpentSeconds) | Client (mirrored to server) | Updated on every interaction; server reconciles | IndexedDB write-through; TanStack optimistic |
| `currentIndex` | Client only | Ephemeral navigation pointer | IndexedDB (restore on refresh) |
| `saveStatus` | Client only | UI feedback state machine | React state only; never persisted |
| `paletteOpen`, `submitDialogOpen`, `isSubmitting` | Client only | Ephemeral UI toggles | React state only |
| `lastServerSync`, `offlineQueueSize` | Client only | Diagnostics / recovery signals | React state only |

### 3.5 What Lives Where

```
React State (useReducer / useState)
├── currentIndex
├── saveStatus
├── paletteOpen
├── submitDialogOpen
├── isSubmitting
└── remainingSeconds (updated by 1s interval)

TanStack Query (cache key: ['attempt', attemptId])
├── attempt metadata (from GET /attempts/{id}/)
│   └── started_at, duration_seconds, status, total_questions
└── questions[] (from published questions + mock_test_questions)
    └── stale-time: Infinity (questions don't change during a session)

TanStack Query (cache key: ['answers', attemptId])
└── server-acknowledged answers (from GET /answers/)
    └── used only on initial load / resume

IndexedDB (store: 'player_session')
├── currentIndex (restore on refresh)
├── answers[].selectedOptionId
├── answers[].state
├── answers[].timeSpentSeconds
├── answers[].dirty
└── answers[].lastModifiedAt

IndexedDB (store: 'answer_queue')
└── pending saves not yet acknowledged by server

Server (PostgreSQL via Django)
└── Ground truth for everything
    ├── attempt status, timing, totals
    └── user_answers (idempotent, UNIQUE constraint on attempt+question)
```

---

## 4. Question State Machine

### 4.1 States (Authoritative — from database schema)

These are the exact states defined in `user_answers.state`. No additional states may be invented.

| State | Meaning |
|---|---|
| `not_visited` | Question has not been viewed. Default for all questions at session start. |
| `visited` | Student navigated to this question but made no selection. |
| `answered` | Student selected an option. Implies selectedOptionId is set. |
| `marked` | Student flagged for review; no option selected. |
| `answered_marked` | Student selected an option AND flagged for review. |

### 4.2 State Diagram

```
                     ┌─────────────────────────────────────────────┐
                     │           not_visited (initial)             │
                     └───────────────────┬─────────────────────────┘
                                         │ navigate to question
                                         ▼
                     ┌─────────────────────────────────────────────┐
                     │                visited                      │◄──────────────────┐
                     └──────┬──────────────────────────┬───────────┘                   │
                            │ select option             │ tap Mark                      │
                            ▼                           ▼                               │
         ┌──────────────────────────┐    ┌─────────────────────────┐                   │
         │         answered         │    │         marked          │                   │
         └──────┬───────────┬───────┘    └──────────┬─────────────┘                   │
                │ tap Mark  │ clear                  │ select option                   │
                ▼           │                        ▼                                 │
   ┌────────────────────┐   │         ┌──────────────────────────┐                    │
   │  answered_marked   │   │         │    answered_marked        │                   │
   └──────┬──────┬──────┘   │         └──────────┬───────────────┘                   │
          │ clear │ unmark  │                     │ unmark (keep option)              │
          │       ▼         │                     └──────────────────────► answered   │
          │  ┌──────────┐   │                                                         │
          │  │ answered │   │                                                         │
          │  └──────────┘   └──────────────────────────────────────────────► visited ─┘
          │
          └──────────────────────────────────────────────────────────────► visited
               (clear removes option; no option + no mark = visited)
```

### 4.3 Transition Table

| Current State | Action | New State | selectedOptionId | Notes |
|---|---|---|---|---|
| `not_visited` | Navigate to question | `visited` | null | Always happens on entry |
| `visited` | Select option | `answered` | set | Normal answer |
| `visited` | Tap Mark | `marked` | null | Bookmark without answer |
| `answered` | Tap Mark | `answered_marked` | preserved | Keep answer, add flag |
| `answered` | Clear response | `visited` | null | Return to visited, not not_visited |
| `answered_marked` | Unmark | `answered` | preserved | Remove flag, keep answer |
| `answered_marked` | Clear response | `marked` | null | Remove answer, keep flag |
| `marked` | Select option | `answered_marked` | set | Answer while flagged |
| `marked` | Unmark | `visited` | null | Remove flag, no answer |

### 4.4 Invalid Transitions

- **`not_visited` → `answered`** without first visiting: impossible in normal flow (navigating always sets `visited` first). If somehow triggered (deep-link, replay), treat as `answered`.
- **Any state → `not_visited`**: `not_visited` is a terminal-start state. No interaction can return a question to `not_visited` once seen.
- **Submitting an attempt when status ≠ `in_progress`**: guard at the UI level; `answered` state changes are rejected by the server for non-in_progress attempts.

### 4.5 Recovery Transitions

On page refresh or tab restore:
- If IndexedDB has state for this question → restore that state directly (no transition)
- If IndexedDB is empty but server has an answer → restore from server answer list (GET `/answers/`)
- If both are empty → `not_visited` (never change visited status from server)

### 4.6 Palette State Mapping

| Question State | Palette Tile | Fill | Icon | Text label |
|---|---|---|---|---|
| `not_visited` | Hollow gray square | `muted` (gray) | `□` | — |
| `visited` | Open circle + amber ring | white + amber outline | `○·` | — |
| `answered` | Emerald filled | `success` (emerald) | `✓` | — |
| `marked` | Violet filled | `primary-violet` | `⚑` | — |
| `answered_marked` | Violet fill + emerald badge | violet + small ✓ badge | `⚑✓` | — |

Color is **never** the sole differentiator — every state carries a distinct shape/icon (WCAG 2.1 §1.4.1, UI/UX Spec §2.2).

---

## 5. Save Status State Machine

### 5.1 States

| State | Meaning | UI Indicator |
|---|---|---|
| `idle` | No pending save; last save succeeded | "Saved ✓" (subtle, fades after 3s) |
| `saving` | HTTP request in flight | "Saving…" with spinner |
| `saved` | Server acknowledged the last write | "Saved ✓" in green |
| `queued` | No network; answer in IndexedDB offline queue | "Offline — queued" with cloud-off icon |
| `failed` | Save failed after all retries; manual retry needed | "Save failed — tap to retry" in amber |

### 5.2 State Diagram

```
          ┌────────────────────────────────────────────────────────────────┐
          │                                                                │
          ▼                                                                │
       [idle] ──── user interaction ────► [saving] ──── 200 OK ──────► [saved]
                                              │                            │
                                              │ network offline             │ fade after 3s
                                              ▼                            ▼
                                         [queued] ◄──────────────────── [idle]
                                              │
                                              │ reconnect → flush queue
                                              ▼
                                         [saving] ──── 200 OK ──────► [saved]
                                              │
                                              │ all retries exhausted
                                              ▼
                                          [failed] ──── user retry ──► [saving]
```

### 5.3 Retry Strategy

```
Retry policy for save failures:
  Attempt 1: immediate
  Attempt 2: 1s delay
  Attempt 3: 3s delay
  Attempt 4: 10s delay (exponential backoff)
  After attempt 4: state → 'failed'; queue preserved in IndexedDB
  
Network offline detection:
  navigator.onLine = false → immediately → 'queued' (skip retries)
  
Flush trigger:
  window 'online' event → flush IndexedDB queue in FIFO order
  On next periodic sync (every 15s when in_progress)
```

### 5.4 Sequence: Online Save

```
Student selects option A for Question 7
│
├── Optimistic: update LocalAnswer in React state immediately
│   Question tile → answered (emerald) instantly
│
├── SaveStatus → 'saving'
│
├── IndexedDB write: mark answer dirty=true
│
├── POST /api/v1/attempts/{id}/answers/save/
│   { question_id, selected_option_id, state: "answered", time_spent_seconds }
│
├── 200 OK → { id, attempt_id, question_id, selected_option_id, state, ... }
│
├── LocalAnswer.dirty = false
│
└── SaveStatus → 'saved' (fade to 'idle' after 3s)
```

### 5.5 Sequence: Offline Save

```
Student selects option B for Question 12 (network offline)
│
├── Optimistic: update LocalAnswer in React state immediately
│
├── SaveStatus → 'queued'
│
├── IndexedDB: write to answer_queue store
│   { attemptId, questionId, selectedOptionId, state, timeSpentSeconds, queuedAt }
│
└── navigator.onLine fires 'online' event
    │
    ├── Flush queue in FIFO order
    │   For each queued entry:
    │   └── POST /answers/save/ → 200 OK → remove from queue
    │
    └── SaveStatus → 'saved'
```

---

## 6. Timer Synchronization Architecture

> **This is the most critical section.** The timer must be reliable across network drops, background tabs, browser suspension, and device clock skew. Every design decision here protects student fairness.

### 6.1 Authoritative Timer Data Source

The backend provides two frozen fields on `ExamAttemptRead`:

```
started_at:       ISO 8601 timestamp (UTC) — when the server transitioned to in_progress
duration_seconds: integer — total allowed duration
```

**There is no `remaining_seconds` field in the frozen API.** The client computes remaining time as:

```
deadline    = new Date(started_at).getTime() + (duration_seconds * 1000)
remaining   = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
```

`Date.now()` is used only for this computation and only after `started_at` is received from the server. The **server enforces auto-submit** via a Celery Beat task regardless of what the client does.

### 6.2 Timer Architecture

```
                    Server
          ┌─────────────────────────────┐
          │  exam_attempts:             │
          │    started_at (UTC)         │
          │    duration_seconds         │
          │                             │
          │  Celery Beat task:          │
          │    auto_submit_expired()    │◄─── fires when deadline passes
          └─────────────┬───────────────┘
                        │ GET /attempts/{id}/
                        ▼
                    Browser
          ┌─────────────────────────────┐
          │  On load / resume:          │
          │    fetch started_at +       │
          │    duration_seconds         │
          │                             │
          │  deadline = started_at +    │
          │             duration_s      │
          │                             │
          │  setInterval(1000ms):       │
          │    remaining = deadline -   │
          │                Date.now()   │
          │    if remaining ≤ 0:        │
          │      triggerClientSubmit()  │
          └─────────────────────────────┘
```

### 6.3 Synchronization Events

```
Event                    │ Client Action
─────────────────────────┼──────────────────────────────────────────────────
Initial load             │ Fetch attempt → compute deadline → start interval
Resume after refresh     │ Fetch attempt → recompute deadline (server is truth)
document.visibilitychange│ Tab becomes visible → recompute deadline from server
  (hidden→visible)       │ fetch GET /attempts/{id}/ → update remainingSeconds
window focus             │ Same: recompute deadline
Network reconnect        │ Same + flush offline queue
Timer reaches 0 on client│ Stop interval → call submitAttempt() → auto-submit flow
Server auto-submit fires │ Client poll on resume finds status='submitted' → redirect
```

### 6.4 Recomputation on Focus Recovery

```
Sequence: Student backgrounds tab for 20 minutes

T=0:   Student backgrounds tab
         interval suspended by browser (throttled to 1-min minimum on background)
         
T+20:  Student foregrounds tab
         document.visibilitychange → 'visible'
         client fires: GET /api/v1/attempts/attempts/{id}/
         
         Case A: status='in_progress'
           deadline recomputed from fresh started_at + duration_seconds
           If remaining <= 0 → auto-submit now
           
         Case B: status='submitted' (server auto-submitted via Celery)
           clear interval → redirect to results page
           
         Case C: status='scored'
           redirect to results page immediately
```

### 6.5 Clock Drift Handling

Client clocks can drift (incorrect device time, NTP issues). The architecture cannot fully solve this without a server-side `remaining_seconds` field (which does not exist in the frozen API). The mitigation:

- On every resume event (focus, visibility change, reconnect), re-fetch the attempt to get a fresh `started_at` reference point rather than computing drift from the old anchor
- `Date.now()` is used only as an offset from `started_at`; both measurements are from the same device clock, so device-level drift is consistent within a session
- Gross drift (device time set far into past/future) cannot be detected without server time — documented in Open Questions (§20.OQ-01)
- The server's Celery task is the enforcement mechanism; client timer is display-only

### 6.6 Timer Warning Thresholds

| Remaining Time | Action |
|---|---|
| 5 minutes (300s) | amber badge on timer; ARIA live-region announcement: "5 minutes remaining" |
| 1 minute (60s) | red badge on timer; ARIA live-region: "1 minute remaining — please submit" |
| 0s (client) | stop interval; trigger submit flow (flush queue first, then POST /submit/) |

### 6.7 Failure Scenario: Submit Fails at T=0

```
Client timer reaches 0
│
├── flush offline queue (bulk-save pending answers)
│
├── POST /api/v1/attempts/{id}/submit/
│   │
│   ├── Success: proceed to /score/ → redirect to results
│   │
│   └── Failure (network error):
│       ├── Retry with exponential backoff (3 attempts, up to 30s)
│       ├── Show persistent error: "Could not submit — retrying…"
│       └── After retries exhausted:
│           ├── Leave attempt open (server auto-submit will fire)
│           └── Show: "Your session will be submitted automatically"
│               server Celery task guarantees eventual submission
```

---

## 7. Offline Queue Architecture

### 7.1 Design Principles

- **Write-through:** every answer interaction writes to IndexedDB immediately before attempting the network call
- **Idempotent:** the backend `UNIQUE(attempt_id, question_id)` constraint means replaying the same save is safe
- **FIFO flush:** queue flushes in the order answers were queued (consistent state)
- **No correctness data in the queue:** only `selectedOptionId`, `state`, `timeSpentSeconds`

### 7.2 Queue Entry Schema

```
AnswerQueueEntry {
  id:                 string        // local UUID (for deduplication)
  attemptId:          string        // server attempt UUID
  questionId:         string        // server question UUID
  selectedOptionId:   string | null
  state:              QuestionState
  timeSpentSeconds:   number
  queuedAt:           number        // Unix ms
  retryCount:         number        // starts at 0
}
```

### 7.3 Offline Buffering Sequence

```
Student Answer ──► React State Update (optimistic)
                    │
                    ▼
               IndexedDB Write
               answer_queue store
                    │
                    ▼
          navigator.onLine ?
         /                  \
        YES                  NO
         │                   │
         ▼                   ▼
   POST /answers/save/    stay queued
         │                   │
     200 OK                  │ 'online' event fires
         │                   │
         ▼                   ▼
   Remove from queue    Flush queue (FIFO)
   Mark dirty=false          │
                             ▼
                       POST each entry
                       in sequence
                             │
                         200 OK for all
                             │
                         Clear queue
```

### 7.4 Flush Sequence on Reconnect

```
Browser 'online' event fires
│
├── Check offlineQueueSize > 0?
│   │
│   ├── YES: show "Syncing saved answers…"
│   │        fetch queue from IndexedDB (sorted by queuedAt ASC)
│   │        for each entry:
│   │          POST /answers/save/ (with retry)
│   │          on 200: delete from queue
│   │          on 409/4xx: log and skip (server state wins)
│   │        on completion: show "All answers synced ✓"
│   │
│   └── NO: no-op
│
└── Also: re-fetch attempt to recheck timer (§6.3)
```

### 7.5 Pre-Submit Queue Flush

Before calling `/submit/`, the player must flush the entire offline queue synchronously (with a 10s timeout):

```
handleSubmitConfirmed()
│
├── flush offline queue (await all pending saves)
│   timeout: 10s
│   on timeout: proceed anyway (server has what it has)
│
├── POST /api/v1/attempts/{id}/submit/
│
└── on 200: POST /api/v1/attempts/{id}/score/ → redirect
```

---

## 8. IndexedDB Strategy

### 8.1 Database Structure

```
Database name:  'prepgenius-player'
Version:        1

Object Stores:
  1. player_session    – one record per active attempt (session metadata)
  2. session_answers   – one record per question in the active attempt  
  3. answer_queue      – offline-queued saves not yet server-acknowledged
```

### 8.2 Store Schemas

**player_session** (keyPath: `attemptId`)

```
{
  attemptId:       string    // UUID; primary key
  examId:          string
  mockTestId:      string | null
  attemptType:     string
  currentIndex:    number    // last viewed question index; restore on refresh
  sessionOpenedAt: number    // Unix ms; for cleanup
}
```

**session_answers** (keyPath: `[attemptId, questionId]` — compound key)

```
{
  attemptId:        string    // part of compound key
  questionId:       string    // part of compound key
  selectedOptionId: string | null
  state:            QuestionState
  timeSpentSeconds: number
  dirty:            boolean   // true = not yet acknowledged by server
  lastModifiedAt:   number    // Unix ms
}
```

**answer_queue** (keyPath: `id`, autoIncrement: true; index on `attemptId`)

```
{
  id:               number    // autoIncrement PK
  attemptId:        string
  questionId:       string
  selectedOptionId: string | null
  state:            QuestionState
  timeSpentSeconds: number
  queuedAt:         number    // Unix ms; for FIFO sort
  retryCount:       number
}
```

### 8.3 Stored Data (Explicit)

| Data | Store | Justification |
|---|---|---|
| `currentIndex` | player_session | Restore navigation position on refresh |
| `selectedOptionId` | session_answers | Restore visual selection on refresh |
| `state` (not_visited / visited / answered / marked / answered_marked) | session_answers | Restore palette colors on refresh |
| `timeSpentSeconds` | session_answers | Persist per-question time to send to server |
| `dirty` flag | session_answers | Know which answers need server sync |
| `attemptId`, `examId`, `attemptType` | player_session | Identify active session |
| Offline queue entries | answer_queue | Buffer offline writes |

### 8.4 Never Stored Data (Explicit Hard Prohibition)

| Data | Why Never Stored |
|---|---|
| `is_correct` (option or answer) | Anti-cheat: frontend must not know correct answers during active attempt |
| `explanation` | Anti-cheat: revealed only in Results, never in player |
| Option bodies marked as correct | Same as above |
| `score`, `accuracy`, `correct`, `incorrect`, `skipped` | Anti-cheat: server computes only after submission |
| `password_hash`, auth tokens | Security: never touch these in the player |
| `full_name`, PII fields | Minimal data principle (DPDP) |

**Enforcement mechanism:** `QuestionSlot` (§3.2) and `LocalAnswer` (§3.3) types must not include `is_correct` or `explanation` fields. The published questions API does return `is_correct` on options during the design phase (ASSUMPTION — see §20.OQ-04). If it does, the question-loading service layer must strip these fields **before** writing to TanStack Query cache or IndexedDB.

### 8.5 Cleanup Strategy

```
Cleanup triggers:
  1. Successful submit + score redirect:
     → delete player_session for this attemptId
     → delete session_answers for this attemptId
     → delete answer_queue entries for this attemptId
     
  2. On player mount for a new attempt:
     → scan player_session for records older than 48 hours → delete stale
     → prevents IndexedDB bloat from abandoned sessions
     
  3. Explicit logout:
     → clear all stores (the student's answers are on the server)
     
Retention policy:
  Active session:         kept until submit + score
  Completed sessions:     deleted immediately on redirect
  Orphaned sessions:      deleted after 48 hours
  Max answer_queue age:   24 hours (entries older than this are stale and dropped)
```

---

## 9. API Contract Mapping

> **Backend Sprint 4 is frozen.** The following documents only existing endpoints derived from the OpenAPI schema (`schema.yml`) and serializers. Where the exact request/response shape is known from the serializers, it is stated as fact. Where the schema is incomplete, it is marked **ASSUMPTION** and listed in §20.

### 9.1 Endpoint Inventory

#### A. Load / Resume Attempt

```
GET /api/v1/attempts/attempts/{id}/

Response: ScoredAttemptDetail (frozen serializer)
{
  id:                UUID
  user_id:           UUID
  exam_id:           UUID
  mock_test_id:      UUID | null
  attempt_type:      'topic' | 'subject' | 'mixed' | 'previous_year' | 'full_mock' | 'daily'
  status:            'created' | 'in_progress' | 'submitted' | 'scored'
  started_at:        ISO timestamp | null
  duration_seconds:  integer | null
  submitted_at:      ISO timestamp | null
  total_questions:   integer
  score:             string(decimal) | null       // only present when scored
  max_score:         string(decimal) | null       // only present when scored
  correct:           integer
  incorrect:         integer
  skipped:           integer
  accuracy:          string(decimal) | null
  time_taken_seconds: integer | null
  answers:           UserAnswerRead[]             // included in ScoredAttemptDetail
  created_at:        ISO timestamp
  updated_at:        ISO timestamp
}

Notes:
  - answers[] is present but empty until status='scored'
  - answers[] during in_progress: ASSUMPTION (see §20.OQ-02)
  - This endpoint is polled on resume, focus, and reconnect (§6.3)
```

#### B. Start Attempt

```
POST /api/v1/attempts/attempts/{id}/start/

Request: (no body)
Response: ExamAttemptRead
  → status transitions created → in_progress
  → server sets started_at to UTC now()
  → server sets duration_seconds (from mock_test or request override)

When called:
  After creating attempt, before first question display.
  If attempt is already in_progress (resume), call GET instead; do not call start again.
```

#### C. Load Mock Test Questions (for full_mock / previous_year)

```
GET /api/v1/attempts/mock-tests/{mock_test_pk}/questions/

Response: MockTestQuestionRead[]
[{
  id:           UUID      // mock_test_question join-table UUID
  mock_test_id: UUID
  question_id:  UUID      // the actual question
  position:     integer   // 1-based; defines ordering
  section:      string | null
  marks:        string(decimal)
}]

Used to build the ordered QuestionSlot[] list.
Must be combined with published question data (endpoint D) to get stems + options.
```

#### D. Load Published Questions

```
GET /api/v1/questions/published/?exam_id={examId}

Response: QuestionRead[]
[{
  id:           UUID
  exam_id:      UUID
  stem:         string
  explanation:  string | null    ⚠ STRIP BEFORE CACHING — see §8.4
  difficulty:   integer (1–5)
  language:     string
  options: [{
    id:         UUID
    label:      string            // 'A', 'B', 'C', 'D'
    body:       string
    is_correct: boolean           ⚠ STRIP BEFORE CACHING — see §8.4
    position:   integer
  }]
  ...
}]

CRITICAL: the service layer must strip `is_correct` from options and `explanation`
from questions before writing to TanStack Query cache or IndexedDB.
See §18.2 for enforcement.

For practice types (topic/subject/mixed): question list not pre-ordered.
See §20 Open Questions OQ-03 and OQ-05 for practice question loading gaps.
```

#### E. Save Answer (idempotent)

```
POST /api/v1/attempts/attempts/{attempt_pk}/answers/save/

Request:
{
  question_id:        UUID
  selected_option_id: UUID | null    // null = clear response
  state:              QuestionState  // 'visited'|'answered'|'marked'|'answered_marked'
  time_spent_seconds: integer
}

Response: UserAnswerRead
{
  id:                 BIGINT
  attempt_id:         UUID
  question_id:        UUID
  selected_option_id: UUID | null
  state:              QuestionState
  is_correct:         boolean | null    ⚠ null during in_progress; NEVER surface to UI
  time_spent_seconds: integer
  answered_at:        ISO timestamp | null
  created_at:         ISO timestamp
}

Idempotency: UNIQUE(attempt_id, question_id) on server → safe to replay.
Error 400: attempt not in 'in_progress' state → show friendly error, stop saves.
Error 404: attempt or question not found → surface to user.
```

#### F. Bulk Save Answers

```
POST /api/v1/attempts/attempts/{attempt_pk}/answers/bulk-save/

Request:
{
  answers: [
    { question_id, selected_option_id, state, time_spent_seconds },
    ...
  ]
}

Response: UserAnswerRead[]

Used for: offline queue flush, pre-submit flush.
More efficient than N sequential single saves.
Prefer this for queue flush; use single save for real-time interaction.
```

#### G. Submit Attempt

```
POST /api/v1/attempts/attempts/{id}/submit/

Request: (no body)
Response: ExamAttemptRead
  → status transitions in_progress → submitted
  → server sets submitted_at = UTC now()
  → server sets time_taken_seconds = submitted_at - started_at

Note: scoring does NOT happen automatically on submit.
The frontend MUST call /score/ immediately after /submit/ succeeds.
```

#### H. Score Attempt

```
POST /api/v1/attempts/attempts/{id}/score/

Request: (no body)
Response: ScoredAttemptDetail (full with answers, scores)
  → status transitions submitted → scored
  → server computes: correct, incorrect, skipped, score, max_score, accuracy
  → server writes attempt_section_analytics rows
  → server updates user_topic_performance

Permission: any authenticated user (ASSUMPTION — see §20.OQ-06 for the security concern)

After this call succeeds → redirect to /results/{attemptId}
```

#### I. Load Existing Answers (for resume)

```
GET /api/v1/attempts/attempts/{attempt_pk}/answers/

Response: UserAnswerRead[]
  All saved answers for this attempt.

Used on resume: populate LocalAnswer map from server's authoritative state.
Merge strategy: server state wins over IndexedDB for answered questions;
  IndexedDB state wins for questions marked 'dirty' (queued but not yet acked).
```

### 9.2 Call Sequence — New Attempt (Full Flow)

```
PracticeClient creates attempt via POST /attempts/
→ redirect to /practice/{attemptId}

MockPlayerShell mounts
│
├── 1. GET /attempts/{attemptId}/          → attempt metadata + status
│
├── 2. If status='created':
│      POST /attempts/{attemptId}/start/   → status becomes in_progress
│
├── 3. If mock_test_id present:
│      GET /mock-tests/{mock_test_id}/questions/  → ordered question list
│
├── 4. GET /questions/published/?exam_id={examId}  → question stems + options
│      (strip is_correct + explanation in service layer)
│
├── 5. Build QuestionSlot[] (join mock_test_questions positions with question content)
│
├── 6. GET /attempts/{attemptId}/answers/  → server answer state (empty for new)
│
├── 7. Restore IndexedDB session_answers (merge with server state)
│
├── 8. Start timer interval
│
└── 9. Render: navigate to currentIndex (from IndexedDB or 0)
```

### 9.3 Call Sequence — Resume Attempt

```
/practice/{attemptId} mounted (user returning)

MockPlayerShell mounts
│
├── 1. GET /attempts/{attemptId}/          → status check + fresh timer anchor
│
│   ├── status='submitted' or 'scored' → redirect to /results/{attemptId}
│   └── status='in_progress' → continue
│
├── 2. GET /questions/published/           → question data (or from TanStack cache)
│
├── 3. GET /attempts/{attemptId}/answers/  → server-acknowledged answers
│
├── 4. Read IndexedDB session_answers      → answers with dirty=true take precedence
│
├── 5. Flush answer_queue (if online)      → sync any queued offline writes
│
├── 6. Restore currentIndex from IndexedDB
│
└── 7. Re-compute timer from fresh started_at
```

---

## 10. Navigation Architecture

### 10.1 Route Integration

The Mock Player lives at the **existing route** `/practice/[attemptId]` (created in the QA Fix Sprint). This is a dynamic segment under the `(student)` layout group. During an active exam, the standard navigation shell (Sidebar, TopBar, BottomTabBar) **must be hidden** — the player renders its own minimal chrome.

This is achieved by:
1. The player page component renders its own full-viewport shell
2. The `(student)` layout's Sidebar and TopBar are conditionally hidden when the player is active — via a client-side route detection in the layout (checking `pathname.startsWith('/practice/') && pathname !== '/practice'`)
3. The BottomTabBar is similarly suppressed

### 10.2 Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  EXAM TOP BAR                                                                      │
│  [← Exit]   [CDP | Science | English]   [⏱ 1:47:23]  [💾 Saved ✓]  [Submit ▶]  │
├──────────────────────────────────────────────────────────┬─────────────────────────┤
│                                                          │   QUESTION NAVIGATOR    │
│  QUESTION AREA                                          │                         │
│                                                          │  Answered  8 · Marked 2 │
│  Q 12 of 50   Science                                   │  Not visited  5         │
│  ──────────────────────────────────────────────────     │                         │
│  Which of the following is a characteristic of          │  CDP:                   │
│  Constructivism as a theory of learning?                │  ①✓ ②✓ ③○ ④⚑ ⑤✓    │
│                                                          │  ⑥▢ ⑦✓ ⑧⚑✓          │
│  (A)  ▢  Learning is passive reception of facts        │                         │
│  (B)  ●  Knowledge is actively constructed              │  Science:               │
│  (C)  ▢  The teacher is the sole knowledge source      │  ⑨✓ ⑩▢ ⑪▢ ⑫▢        │
│  (D)  ▢  Memorization is the primary strategy          │  ⑬⚑ ⑭✓               │
│                                                          │                         │
│                                                          │  English:               │
│  ────────────────────────────────────────────────────   │  ⑮▢ ⑯▢ ...           │
│                                                          │                         │
│  [ ‹ Prev ]   [ ⚑ Mark for Review ]   [ Save & Next › ] │  [Jump to Unanswered]  │
│                [ Clear Response ]                        │                         │
└──────────────────────────────────────────────────────────┴─────────────────────────┘

Legend:  ✓=answered  ⚑=marked  ⚑✓=answered+marked  ○=visited  ▢=not_visited
```

**Desktop specifications:**
- Question area: flexible left column, max-width ~760px, centered within its area
- Navigator: fixed right panel, 280px wide, persistent (no drawer needed), scrollable grid
- Top bar: sticky, full width, height 56px
- Section tabs: styled as pills or underline tabs in the top bar
- Option tiles: full-row clickable, min-height 52px, `rounded-lg`, clear selected state

### 10.3 Mobile Layout

```
┌──────────────────────────────────┐
│  [←]  [CDP|Sci|Eng]  ⏱1:47:23  │  ← sticky top bar, 48px
│                         ✓Saved  │
├──────────────────────────────────┤
│                                  │
│  Q 12 of 50                      │
│  Science                         │
│  ─────────────────────────────   │
│  Which of the following is a     │
│  characteristic of               │
│  Constructivism as a theory      │
│  of learning?                    │
│                                  │
│  (A) ▢  Learning is passive…     │
│                                  │
│  (B) ● Knowledge is actively…    │
│                                  │
│  (C) ▢  The teacher is the…      │
│                                  │
│  (D) ▢  Memorization is the…     │
│                                  │
│                                  │
│                                  │
├──────────────────────────────────┤
│  [‹ Prev]  [⚑Mark]  [Next ›]   │  ← action bar, 56px, above OS chrome
│  [Clear]         [⊞ 12/50]     │  ← palette trigger shows progress
└──────────────────────────────────┘

Palette (bottom sheet, 70% height):
┌──────────────────────────────────┐
│  ── Answered 8 · Marked 2 ────  │
│  CDP: ①✓ ②✓ ③○ ④⚑ ⑤✓         │
│       ⑥▢ ⑦✓ ⑧⚑✓               │
│  Science: ⑨✓ ⑩▢ ⑪▢ ⑫▢        │
│            ⑬⚑ ⑭✓               │
│  [Jump to first unanswered]     │
│                [Close ×]        │
└──────────────────────────────────┘
```

### 10.4 Section Navigation

For multi-section exams (CTET: CDP / Science / English), sections are shown as tab pills in the top bar. Tapping a section tab scrolls/jumps to the first question in that section. The navigator grid groups questions by section with a section label header.

For single-section or practice-type attempts, section tabs are hidden.

### 10.5 Question Navigation Rules

- **Save & Next**: save current answer state → advance `currentIndex` by 1
- **Prev**: save current state (even if unchanged) → decrement `currentIndex` by 1
- **Palette jump**: save current state → set `currentIndex` to tapped question
- **On every navigation away from a question**: if `state === 'not_visited'` → transition to `'visited'` (record the visit even without an answer)
- **Boundary handling**: at Q1, Prev is disabled; at last Q, Next becomes "Review & Submit"

---

## 11. Submit Workflow

### 11.1 Submit Flow Diagram

```
Student taps [Submit]
│
├── submitDialogOpen = true
│
│   Submit Confirmation Dialog:
│   ┌─────────────────────────────┐
│   │  Ready to Submit?           │
│   │  Answered:    38 of 50      │
│   │  Marked:       3            │
│   │  Unanswered:   9            │
│   │  [ Review Unanswered ]      │
│   │  [ Submit Attempt ]  ← primary CTA │
│   │  [ Cancel ]                 │
│   └─────────────────────────────┘
│
├── if "Review Unanswered":
│   └── close dialog → jump to first unanswered question
│
└── if "Submit Attempt":
    │
    ├── isSubmitting = true (disables button; prevents duplicate clicks)
    │
    ├── flush offline answer queue (await, 10s timeout)
    │   send remaining dirty answers via bulk-save
    │
    ├── POST /api/v1/attempts/{id}/submit/
    │   │
    │   ├── 200 OK (status → submitted)
    │   │   │
    │   │   └── POST /api/v1/attempts/{id}/score/
    │   │       │
    │   │       ├── 200 OK (status → scored)
    │   │       │   → clean up IndexedDB session
    │   │       │   → router.push('/results/{attemptId}')
    │   │       │
    │   │       └── error (server issue)
    │   │           → poll GET /attempts/{id}/ every 2s for up to 30s
    │   │           → when status='scored' → redirect
    │   │           → after 30s → redirect anyway (show "processing" on results page)
    │   │
    │   └── error (network / 5xx)
    │       → retry up to 3 times (1s, 3s, 10s delay)
    │       → if all fail: show "Could not submit — check connection"
    │       → isSubmitting = false (allow retry)
    │       → server Celery task will auto-submit when timer expires
```

### 11.2 Auto-Submit at Timer Expiry

```
Client timer reaches 0s
│
├── Stop interval
│
├── Show banner: "Time's up! Submitting your answers…"
│
└── Execute same flow as §11.1 Submit (skip dialog — no user choice needed)
    Starting from: flush offline queue → POST /submit/ → POST /score/ → redirect
```

### 11.3 Duplicate Click Protection

- `isSubmitting = true` is set before any network call
- The Submit button is `disabled` when `isSubmitting === true`
- Even if the user double-taps, the state gate prevents a second flight
- The server's state machine (`submitted → scored` is a one-way transition) provides backend-level protection

### 11.4 Submit Dialog Summary Calculation

The unanswered count displayed in the dialog is computed from `LocalAnswer` state:

```
answered   = count of answers where state ∈ {'answered', 'answered_marked'}
marked     = count of answers where state ∈ {'marked', 'answered_marked'}
unanswered = totalQuestions - answered
```

This is a client-side display computation only — it does not affect scoring. Scoring is always server-side.

---

## 12. Failure Recovery

### 12.1 Recovery Scenarios Matrix

| Scenario | Detection | Recovery Action |
|---|---|---|
| Page refresh (F5) | Player remounts | Load from IndexedDB + server sync (§9.3 Resume) |
| Browser tab close + reopen | Player remounts | Same as page refresh |
| Browser crash | Player remounts | Same; dirty answers flushed on reconnect |
| Internet loss mid-answer | `navigator.onLine = false` | Buffer to answer_queue; show 'queued' status |
| Internet returns | `window 'online'` event | Flush answer_queue; re-sync timer |
| API timeout (save) | fetch timeout / error | Retry 3x with backoff; then 'failed' status |
| Session expired (401) | API returns 401 | Redirect to login; attempt state preserved server-side |
| Attempt already submitted | GET returns status='submitted' | Redirect to results |
| Attempt already scored | GET returns status='scored' | Redirect to results |
| Server 500 on save | HTTP 5xx | Retry 3x; buffer to queue |
| IndexedDB unavailable | open() rejected | Fall back to in-memory only (no persistence); warn user |
| Timer expires while offline | Client-side at T=0 | Submit when back online; Celery handles if client never returns |
| Duplicate submit | `isSubmitting = true` gate | Second click rejected client-side; server rejects duplicate via status machine |
| Score endpoint fails | POST /score/ error | Poll attempt status; redirect when scored; fallback after 30s |

### 12.2 Page Refresh Recovery Flow

```
Student hits F5 (or browser crash + reopen)

MockPlayerShell mounts for /practice/{attemptId}
│
├── Query IndexedDB player_session for this attemptId
│   │
│   ├── Found:
│   │   ├── restore currentIndex
│   │   └── restore session_answers (selected options + states)
│   │
│   └── Not found:
│       └── start fresh (currentIndex=0, empty answers)
│
├── Parallel fetch:
│   ├── GET /attempts/{attemptId}/    → server state + timer anchor
│   └── GET /attempts/{attemptId}/answers/  → server-acknowledged answers
│
├── Merge strategy:
│   ├── For each question:
│   │   ├── If IndexedDB.dirty = true (queued, not server-acked): use IndexedDB
│   │   └── Else: use server answer (most recent ack wins)
│   │
│   └── answer_queue: flush immediately if online
│
├── Recompute timer from fresh started_at
│
└── Render: pick up where student left off
```

### 12.3 Network Loss Mid-Session Flow

```
Network drops (navigator.onLine = false)

├── SaveStatus → 'queued'
│
├── All new answers go directly to IndexedDB answer_queue
│
├── Show persistent banner: "You're offline — answers are being saved locally"
│
├── Timer continues (client-computed from stored deadline)
│   Note: if T=0 while offline, queue submit attempt for when back online
│
└── Network returns (window 'online')
    │
    ├── Hide offline banner
    ├── Flush answer_queue (§7.4)
    ├── Re-fetch attempt for timer re-sync
    └── SaveStatus → 'saved' after flush completes
```

### 12.4 Session Expiry Recovery (401)

```
API returns 401 Unauthorized (access token expired)

├── The session was not explicitly destroyed
├── Redirect to /login?next=/practice/{attemptId}
├── After login, middleware redirects back to /practice/{attemptId}
└── Player remounts → resume flow (§9.3)

Note: The server preserves in_progress attempts across auth token rotations.
The student's answers are safe on the server.
```

---

## 13. Component Hierarchy

### 13.1 Component Tree

```
/practice/[attemptId]/page.tsx        (RSC — fetches initial attempt, starts sequence)
└── MockPlayerShell                   (Client — top-level player context provider)
    ├── ExamTopBar                    (Client — timer, status, section tabs, submit)
    │   ├── SectionTabRow             (Client — CDP|Science|English tabs)
    │   ├── Timer                     (Client — countdown display, warning states)
    │   ├── SaveStatus                (Client — idle/saving/saved/queued/failed badge)
    │   └── SubmitButton              (Client — opens SubmitDialog)
    │
    ├── QuestionPanel                 (Client — renders current question)
    │   ├── QuestionHeader            (Client — "Q12 of 50 · Science")
    │   ├── QuestionStem              (Client — question text, multilingual)
    │   └── OptionList                (Client — 4 option tiles)
    │       └── OptionTile × 4        (Client — single option; selected state)
    │
    ├── QuestionActionBar             (Client — Prev / Mark / Next / Clear)
    │   ├── PrevButton                (Client — disabled at first question)
    │   ├── MarkReviewButton          (Client — toggles marked/answered_marked)
    │   ├── ClearResponseButton       (Client — resets to visited)
    │   └── NextButton                (Client — "Save & Next" or "Review & Submit")
    │
    ├── PaletteDrawerTrigger          (Client — mobile only; shows count chip)
    │
    ├── QuestionPalette               (Client — persistent desktop / sheet mobile)
    │   ├── SectionGroup × N          (Client — section label + question tiles)
    │   │   └── QuestionTile × N      (Client — state-colored numbered button)
    │   ├── PaletteLegend             (Client — colorblind-safe state key)
    │   ├── PaletteSummary            (Client — "Answered 38 · Marked 3 · Remaining 9")
    │   └── JumpToUnansweredButton    (Client)
    │
    ├── SubmitDialog                  (Client — pre-submit confirmation)
    │   ├── SubmitSummaryStats        (Client — unanswered/marked counts)
    │   ├── ReviewUnansweredButton    (Client — closes dialog, jumps to first unanswered)
    │   └── ConfirmSubmitButton       (Client — triggers submit flow)
    │
    └── OfflineBanner                 (Client — shown when SaveStatus='queued')
```

### 13.2 Component Specifications

| Component | Classification | Responsibility | Key Dependencies |
|---|---|---|---|
| `page.tsx` (RSC) | Server Component | Initial data fetch; redirects if submitted/scored | `getAttemptDetailServer`, `getCurrentUser` |
| `MockPlayerShell` | Client Component | Context provider; manages `PlayerState`; orchestrates all player logic | `useReducer`, `useIndexedDB`, `useTanStackQuery` |
| `ExamTopBar` | Client Component | Sticky header; section tabs; hosts Timer, SaveStatus, SubmitButton | Reads from PlayerState context |
| `SectionTabRow` | Client Component | Section pill/tab navigation; jumps to section start | `sections[]` from QuestionSlots |
| `Timer` | Client Component | Countdown display; fires warning events; auto-submit at 0 | `remainingSeconds` from context; 1s interval |
| `SaveStatus` | Client Component | Visual indicator of save state machine | `saveStatus` from context |
| `SubmitButton` | Client Component | Opens dialog; disabled when `isSubmitting=true` | `isSubmitting` from context |
| `QuestionPanel` | Client Component | Renders current question (stem + options) | `questions[currentIndex]` from context |
| `QuestionHeader` | Client Component | "Q N of total · section" with progress pill | `currentIndex`, `totalQuestions`, `section` |
| `QuestionStem` | Client Component | Multilingual question text; respects `preferred_language` | `stem` from QuestionSlot |
| `OptionList` | Client Component | Renders 4 OptionTile children; handles selection | `options[]` from QuestionSlot |
| `OptionTile` | Client Component | Single answer option; full-row tap target (≥44px); selected/unselected state | Dispatch to PlayerState |
| `QuestionActionBar` | Client Component | Prev/Mark/Clear/Next buttons; adapts labels at boundaries | `currentIndex`, `totalQuestions`, answer state |
| `PaletteDrawerTrigger` | Client Component | Mobile-only; shows count chip; opens Sheet | `paletteOpen` in context |
| `QuestionPalette` | Client Component | Desktop: docked panel. Mobile: Sheet wrapper | `questions[]`, `answers` from context |
| `SectionGroup` | Client Component | Groups QuestionTiles by section with label | `section` field on QuestionSlot |
| `QuestionTile` | Client Component | Numbered grid button; state colors + icons; keyboard-navigable | `answers[questionId].state` |
| `PaletteLegend` | Client Component | Static key: shape + label for each state (colorblind-safe) | None |
| `PaletteSummary` | Client Component | "Answered N · Marked N · Not visited N" | Computed from `answers` map |
| `SubmitDialog` | Client Component | Modal confirm; shows summary; two actions | `submitDialogOpen` from context |
| `OfflineBanner` | Client Component | Fixed top or bottom banner shown when queued | `saveStatus === 'queued'` |

---

## 14. Mobile UX Specification

### 14.1 Touch Target Requirements

All interactive elements meet WCAG 2.5.5 (AAA target, AA minimum):

| Element | Minimum size |
|---|---|
| Option tiles | Full row width × 52px minimum height |
| QuestionTile (palette) | 44×44px |
| Action bar buttons (Prev/Next/Mark) | 48×48px, with 8px spacing |
| Timer — no tap target needed | Display only |
| Submit button | Full width × 48px |
| Palette trigger | 44×44px chip |

### 14.2 Navigation Patterns

- **Single question per view:** never show two questions simultaneously on mobile
- **Bottom action bar:** Prev · Mark for Review · Next (primary, right-aligned)
- **Secondary actions:** Clear Response sits below the main action row, smaller
- **Palette access:** persistent chip in bottom-right showing "⊞ 12/50"; tapping opens bottom Sheet
- **Sheet height:** 70% viewport; not dismissable by drag-to-close during exam (prevents accidental close); has explicit close button
- **Back navigation:** back gesture / hardware back button shows confirmation ("Are you sure you want to leave?"); does not exit exam silently

### 14.3 Palette on Mobile

The Question Navigator opens as a `Sheet` from the bottom, using shadcn/ui Sheet component:

```
Mobile Palette Sheet behavior:
  - Opens to 70% viewport height
  - Contains scrollable grid (ScrollArea)
  - PaletteSummary pinned to top of sheet
  - Legend pinned to top (compact, 2-column)
  - Grid: 5 tiles per row (60px tiles with 4px gap) for up to 150Q
  - Tapping a tile: closes sheet + jumps to that question
  - "Jump to unanswered" button: closes sheet + jumps to first unvisited/visited
  - Close button (×): closes sheet only
  - Sheet does not close on backdrop tap (prevents accidental close in exam)
```

### 14.4 Orientation Handling

- **Portrait (primary):** all layouts above are portrait-first
- **Landscape on mobile:** question area shrinks, action bar remains; option text may truncate — use `line-clamp-3` with "show more" for long stems in landscape
- **Tablet landscape:** treat as desktop breakpoint (persistent palette panel)

### 14.5 Performance on Low-End Devices

- No animations during answer selection (instant state change only)
- Palette tiles use CSS classes only (no JS animation)
- Timer updates DOM text only (not re-rendering parent component)
- Lazy-load the palette grid (virtual scroll if > 100 questions) — **Future Enhancement**
- Question stems: no markdown rendering in MVP (plain text only); rich text is Future Enhancement

---

## 15. Desktop UX Specification

### 15.1 Persistent Palette Panel

On `lg` breakpoint (1024px+), the Question Navigator is a fixed 280px right panel — no sheet/drawer needed. The question area flexes to fill remaining width with a max of ~760px to maintain comfortable reading line length.

```
Palette panel specifications:
  Width: 280px (fixed)
  Height: 100vh minus top bar (56px)
  Overflow: ScrollArea (y-scroll within panel)
  Position: sticky right, full height
  Tile grid: 5 columns (48px tiles)
  Section headers: sticky within scroll
```

### 15.2 Keyboard Shortcuts

| Key | Action |
|---|---|
| `→` / `]` | Next question |
| `←` / `[` | Previous question |
| `1`, `2`, `3`, `4` | Select option A, B, C, D |
| `m` | Toggle Mark for Review |
| `c` | Clear Response |
| `s` | Open Submit Dialog |
| `Escape` | Close Submit Dialog / Close Palette |
| `g` + number | Jump to question N (g12 = go to Q12) |
| `Tab` / `Shift+Tab` | Move focus through interactive elements (standard a11y) |

Shortcuts are displayed in a `Tooltip` on hover for each button. They are disabled when any dialog/sheet is open (to prevent conflicts with dialog keyboard handling).

### 15.3 Widescreen Optimization (1280px+)

At 1280px+, the question area may optionally show a wider reading column. No structural changes — the layout grid handles this naturally.

At 1440px+, a narrow left gutter can be added for visual balance, centering the question area.

---

## 16. Accessibility Requirements

### 16.1 WCAG 2.1 AA Compliance Requirements

| Criterion | Implementation |
|---|---|
| 1.1.1 Non-text content | `aria-label` on all icon-only buttons; alt text on any images |
| 1.3.1 Info and relationships | Semantic HTML5 structure; `<main>`, `<header>`, `<nav>`, `<section>` |
| 1.4.1 Use of color | Question states: color + shape + number (never color alone — §4.6) |
| 1.4.3 Contrast (minimum) | 4.5:1 for question text; 3:1 for UI elements; checked at design token level |
| 2.1.1 Keyboard | Full keyboard navigation; all actions reachable without mouse |
| 2.1.2 No keyboard trap | Dialog/sheet focuses trappable; Escape always exits |
| 2.4.3 Focus order | Logical tab order: TopBar → Question → Options → Action Bar |
| 2.4.7 Focus visible | `focus-visible:ring-2 ring-blue-500` on all interactive elements |
| 4.1.2 Name, role, value | All buttons have `aria-label`; selected option has `aria-checked` or `aria-selected` |

### 16.2 Timer Announcements

Timer ARIA requirements:

```html
<!-- Timer element -->
<div role="timer" aria-live="off" aria-label="Time remaining: 1 hour 47 minutes">
  1:47:23
</div>

<!-- At 5 minutes remaining: -->
<div role="alert" aria-live="assertive" class="sr-only">
  5 minutes remaining. Please review your answers.
</div>

<!-- At 1 minute remaining: -->
<div role="alert" aria-live="assertive" class="sr-only">
  1 minute remaining. Your answers will be submitted automatically.
</div>

<!-- At 0: -->
<div role="alert" aria-live="assertive" class="sr-only">
  Time's up. Submitting your answers now.
</div>
```

The timer's `aria-live="off"` prevents 60 announcements per minute. Only warning milestones are announced via `aria-live="assertive"`.

### 16.3 Question Navigation Announcements

```
When navigating to a new question:
  aria-live region (polite) announces:
  "Question {N} of {total}. {section}. {state label}."
  
When saving an answer:
  aria-live region (polite) announces:
  "Answer saved."
  
When saving fails:
  aria-live region (assertive) announces:
  "Answer could not be saved. Retrying."
```

### 16.4 Option Selection

Each option is rendered as a `<button>` (not a radio input) to maximize control over keyboard and touch behavior. `aria-pressed` indicates the selected state:

```html
<button
  aria-pressed={isSelected}
  aria-label="Option B: Knowledge is actively constructed by the learner"
  onClick={handleSelect}
>
  (B) Knowledge is actively constructed by the learner
</button>
```

### 16.5 Reduced Motion

All transition classes respect `prefers-reduced-motion`. Timer warning transitions (color changes) apply instantly. No countdown animations.

---

## 17. Performance Targets

### 17.1 Render Latency

| Metric | Target | Measurement |
|---|---|---|
| Time to interactive (new attempt, warm network) | < 2.5s | Lighthouse on Moto G4 / 3G |
| Time to interactive (resume, cached questions) | < 1.5s | TanStack Query stale cache |
| First question render (after data loaded) | < 100ms | React DevTools profiler |
| Question navigation (Prev/Next) | < 50ms | No network call; local state |
| Palette open (mobile sheet) | < 150ms | CSS transition |
| Save latency (online, single answer) | < 800ms | Network p95 |
| Queue flush (10 answers, online) | < 3s | Bulk save endpoint |

### 17.2 Memory Budget

| Resource | Target |
|---|---|
| Total player JS bundle | < 120kB gzipped (code-split from main app) |
| Questions in memory | All at once (max 150 questions × ~1KB = ~150KB) |
| Answer map | < 50KB for 150 answers |
| IndexedDB size (session) | < 500KB per active session |
| Timer interval memory | Negligible (1 `setInterval`) |

### 17.3 Network Budget

| Call | Max payload | Frequency |
|---|---|---|
| GET /attempts/{id}/ | < 2KB | Once on load; on every resume |
| GET /mock-tests/{id}/questions/ | < 15KB (150Q × ~100B) | Once per session |
| GET /questions/published/ | < 300KB (150Q × ~2KB) | Once per session; TanStack cached |
| POST /answers/save/ | < 300B | Once per user interaction |
| POST /answers/bulk-save/ | < 5KB (10+ answers) | On queue flush / pre-submit |
| POST /submit/ | < 100B | Once per session |
| POST /score/ | < 100B | Once per session |

### 17.4 Save Latency SLA

Answer save must complete within 1 second under normal network conditions. Beyond 1 second, the SaveStatus indicator transitions to `saving` (visible reassurance). Beyond 5 seconds, the answer is buffered to IndexedDB and status transitions to `queued`.

---

## 18. Security Considerations

### 18.1 Session Security

- Authentication is via httpOnly + Secure + SameSite cookies (established by the auth layer)
- The Mock Player makes no authentication decisions; it relies on the existing cookie auth
- If the server returns 401, redirect to login (§12.4) — never retry with stored credentials

### 18.2 Answer Integrity — The Core Anti-Cheat Invariant

This is the single most important security requirement in the player.

**The frontend must NEVER possess correct answer data during an active attempt.**

The backend `PublishedQuestion` serializer currently returns `is_correct` on option objects and `explanation` on questions. This data is legitimately needed by the Results page (after scoring). During an active attempt, it must be stripped before any client-side storage.

**Enforcement boundary: the question service layer** (the module that fetches from `/questions/published/` and builds `QuestionSlot[]`) must:

```
[Service Layer Responsibility — not in any component]

1. Fetch from GET /questions/published/?exam_id=X
2. Map response to QuestionSlot[]:
   For each question:
     - Include: id, stem, options[].id, options[].label, options[].body, options[].position
     - EXCLUDE: options[].is_correct
     - EXCLUDE: explanation
3. Write stripped objects to TanStack Query cache
4. Write stripped objects to IndexedDB session_answers (stems/options not stored there, but enforce)
```

If the backend ever adds a "player-safe" endpoint that omits these fields by design, this stripping becomes redundant but harmless. The stripping logic must remain until the backend guarantees exclusion.

**What is never accessible in the client during an active attempt:**

| Data | Where blocked |
|---|---|
| `options[].is_correct` | Stripped in question service layer before cache write |
| `question.explanation` | Stripped in question service layer before cache write |
| `user_answers.is_correct` | The `UserAnswerRead` returned by `/answers/save/` includes `is_correct` — this field must be stripped before writing to `LocalAnswer` / React state |
| `attempt.score`, `correct`, `incorrect`, `skipped`, `accuracy` | These are `null` until `status='scored'`; never surface them during in_progress |

### 18.3 Duplicate Submission Protection

Three layers:

1. **Client:** `isSubmitting = true` gate prevents double-clicks
2. **Server state machine:** `in_progress → submitted` is a one-way transition; a second `POST /submit/` on an already-submitted attempt returns an error
3. **`POST /score/`:** `submitted → scored` is one-way; duplicate score calls are idempotent (same result, no double-scoring)

### 18.4 XSS Prevention

- All question stems and option text are rendered as plain text (`textContent` / `{children}` in JSX, never `dangerouslySetInnerHTML`)
- If rich text is ever required (future), use a sanitization library (DOMPurify) — this is a Future Enhancement
- Localization strings are from the next-intl translation files, not from user input
- No third-party scripts injected during the player session

### 18.5 IndexedDB Data Sensitivity

IndexedDB is same-origin-restricted and not accessible cross-site. The data stored (selectedOptionId, state, timeSpentSeconds) is non-sensitive operational data. No PII is stored in IndexedDB. No auth tokens are stored. No correct-answer data is stored.

---

## 19. Risk Assessment

### 19.1 Risk Matrix

| # | Risk | Severity | Probability | Priority |
|---|---|---|---|---|
| R-01 | Correct answer data leaked to client during active attempt | Critical | Low (requires service-layer discipline) | P0 |
| R-02 | Answer lost due to offline + no IndexedDB recovery | High | Medium (flaky networks are the target environment) | P0 |
| R-03 | Timer drift leads to unfair extra time | High | Medium (device clock skew) | P1 |
| R-04 | Submit without score; user redirected to empty results | High | Low (POST /score/ may fail silently) | P1 |
| R-05 | Double submit corrupts attempt state | Medium | Low (protected by client + server) | P2 |
| R-06 | IndexedDB unavailable (private browsing, storage quota) | Medium | Medium | P2 |
| R-07 | Long Assamese question text breaks mobile layout | Medium | High (Assamese-first product) | P1 |
| R-08 | Question load timeout on 2G (300KB published questions) | High | Medium (tier-2/3 network) | P1 |
| R-09 | Timer interval not cleaned up on unmount → memory leak | Low | Medium | P2 |
| R-10 | Practice-type attempts (topic/subject) have no question order → UX gap | High | Certain (backend has no by-topic player API) | P0 |

### 19.2 Mitigations

**R-01 — Answer Integrity Leak**  
Mitigation: strict service-layer stripping (§18.2); TypeScript types `QuestionSlot` and `LocalAnswer` exclude `is_correct`/`explanation` by design; code review checklist item; ideally, a backend endpoint that never sends these fields (Open Question OQ-04).

**R-02 — Answer Loss on Offline**  
Mitigation: write-through IndexedDB on every interaction (§7); idempotent server writes (§9.1.E); offline banner with queued status (§5); pre-submit queue flush (§11.1).

**R-03 — Timer Drift**  
Mitigation: re-anchor on every focus/resume event (§6.3); server Celery task is the enforcement mechanism regardless of client time (§6.1). Residual risk: documented in OQ-01.

**R-04 — Submit Without Score**  
Mitigation: POST /score/ called immediately after /submit/ succeeds (§11.1); polling fallback for up to 30s; redirect anyway after timeout (results page handles pending state gracefully).

**R-06 — IndexedDB Unavailable**  
Mitigation: wrap all IndexedDB calls in try/catch; on failure, fall back to in-memory only with a visible warning banner: "Answers cannot be saved locally — stay online to protect your progress."

**R-07 — Assamese Text Layout**  
Mitigation: minimum body font size 1rem (never below 14px); min-height on option tiles (52px minimum — text wraps, tile expands); test specifically with long Assamese option text during implementation. Bengali-Assamese script has longer conjunct characters — allow 20% more height budget than Latin layout.

**R-08 — Question Load Timeout**  
Mitigation: TanStack Query `staleTime: Infinity` so re-navigation never re-fetches; loading skeleton (immediate feedback); consider a smaller "player-optimized" question endpoint in future (OQ-05). For MVP: show progressive skeleton per question slot as data arrives.

**R-10 — Practice Type Question Ordering**  
This is a design gap. For `topic`, `subject`, and `mixed` attempts, the backend has no endpoint that returns an ordered question list for the player. The mock-test-questions endpoint only covers `full_mock` and `previous_year` types. This must be resolved before the player can support practice modes. See OQ-03.

---

## 20. Open Questions

All assumptions and unresolved dependencies are listed here. Each must be confirmed or designed before implementation begins.

---

**OQ-01 — Server Time Endpoint**

*Question:* Can the backend expose a `/api/v1/time/` endpoint returning the server's current UTC timestamp? This would allow the client to detect and compensate for device clock skew.

*Impact:* Without this, devices with significantly wrong clocks will show an inaccurate timer. The server's enforcement (Celery auto-submit) is still correct; only the display is wrong. Medium UX risk.

*Current approach:* No server time endpoint in frozen backend. Re-anchor timer on every resume event using `started_at` from the attempt response (§6.5). Clock skew within a session is consistent.

*Status:* **ASSUMPTION — server time synchronization is best-effort within the frozen API.**

---

**OQ-02 — `answers[]` in `ScoredAttemptDetail` during `in_progress`**

*Question:* The `GET /attempts/{id}/` endpoint returns `ScoredAttemptDetail` which includes `answers: UserAnswerRead[]`. Are these answers populated during `status='in_progress'`, or only after `status='scored'`?

*Impact:* If populated during `in_progress`, the resume flow (§9.3) can use GET /attempts/{id}/ to get both attempt metadata AND existing answers in one call, reducing load time. If not, a separate GET /answers/ call is needed.

*Current approach:* Architecture assumes a separate GET /attempts/{attempt_pk}/answers/ call for resume (§9.3, step 6). If confirmed to be populated, eliminate the separate call.

*Status:* **ASSUMPTION — separate /answers/ call required. Verify before implementation.**

---

**OQ-03 — Question Ordering for Practice Types (topic/subject/mixed)**

*Question:* For `attempt_type ∈ {'topic', 'subject', 'mixed'}`, there is no `mock_test_id`. The mock-test-questions endpoint only works for attempts that have a mock_test. How does the player load an ordered, deterministic question list for practice-type attempts?

*Impact:* **P0 blocker.** Without this, practice-mode attempts cannot display questions in any meaningful order. The player cannot be built for topic/subject/mixed modes.

*Current approach:*
- Option A (requires backend change — NOT allowed): add a `/attempts/{id}/questions/` endpoint that returns ordered questions regardless of type.
- Option B (client-side, within frozen API): for practice types, fetch `GET /questions/published/?exam_id=X` and filter client-side by the topic/subject from URL params. Order is non-deterministic (server pagination order). This is acceptable for practice (not exam-critical) but needs backend confirmation that `exam_id` filter is stable.
- Option C: practice-type sessions always create a `mock_test` behind the scenes (even for topic practice). If the backend creates a `mock_test` with a random selection of questions on attempt create, then `mock_test_id` will always be present and the existing mock-test-questions endpoint works.

*Status:* **CRITICAL OPEN QUESTION — must be answered before any implementation begins. Recommend investigating Option C (backend creates mock_test for all session types at create time).**

---

**OQ-04 — Published Questions Endpoint Security During Active Attempt**

*Question:* Does `GET /questions/published/?exam_id=X` include `is_correct` on options and `explanation` on questions? Is there a player-safe variant that omits these?

*Impact:* If `is_correct` is returned, the frontend service layer must strip it (§18.2). If a dedicated player endpoint without these fields is feasible in a future sprint, that eliminates the risk of developer error.

*Current approach:* Service-layer stripping (§18.2) is the mitigation. TypeScript types enforce exclusion.

*Status:* **ASSUMPTION — stripping is implemented in service layer. Backend endpoint enhancement is a future consideration.**

---

**OQ-05 — Bulk Question Loading for Large Exams**

*Question:* CTET has 150 questions. `GET /questions/published/?exam_id=X` returns all published questions for that exam — potentially hundreds if multiple mock tests share a pool. Is there a `question_ids` filter or a paginated variant?

*Impact:* Over-fetching questions (e.g. 500 questions when the mock has 150) wastes bandwidth on 3G and increases load time (performance risk R-08).

*Acceptable MVP approach:* Fetch all published questions for the exam; TanStack Query caches them for the session. On 3G this may take 3–5 seconds for a large pool. The skeleton state (§12.1) covers the wait.

*Status:* **ASSUMPTION — full exam question set is fetched and cached. Scale optimization is post-MVP.**

---

**OQ-06 — Score Endpoint Permission Scope**

*Question:* `POST /attempts/{id}/score/` currently uses `AttemptBaseView` (permission: `IsAuthenticatedReadOnly`). Any authenticated user can score any attempt by ID. There is no ownership check. (This is a known security bug from the QA sprint — BUG-009.)

*Impact on player:* The player calls `/score/` with the student's own cookie, which is correct behavior. However, the lack of ownership check means other users could trigger scoring on someone else's attempt.

*Current approach:* The player always calls `/score/` with the authenticated user's session. In the current single-user MVP context, this is correct. The ownership gap is a backend security issue to fix in a future sprint.

*Status:* **KNOWN GAP — noted for backend sprint. Player implementation is not blocked.**

---

**OQ-07 — Auto-Submit Celery Task Chains to Score**

*Question:* When the Celery task `auto_submit_expired_attempts()` fires and transitions an attempt from `in_progress` → `submitted`, does it immediately chain to scoring, or does it leave the attempt in `submitted` state indefinitely?

*Impact:* If auto-submit doesn't chain to score, a student whose timer expired (client was closed, no submit called) will return to find `status='submitted'` on the results page, which shows `EmptyResultState`. Their results are lost from the UI perspective.

*Current approach:* The player polls GET /attempts/{id}/ on resume; if it finds `submitted`, it calls `POST /score/` immediately (§12.1 recovery). This mitigates the gap if the student returns.

*Status:* **ASSUMPTION — player calls /score/ if it finds status='submitted'. Backend auto-score chaining is strongly recommended for a future sprint.**

---

**OQ-08 — Heartbeat / Presence Endpoint**

*Question:* Should the player send periodic heartbeat signals to the server (e.g., every 30 seconds) to maintain session presence, prevent timeout, and allow the server to detect abandoned sessions?

*Impact:* Without heartbeats, the server has no way to know if a student is actively taking the exam or has abandoned it. Celery auto-submit handles the latter case. There is no session-timeout risk for well-designed JWT auth (the refresh cookie handles token rotation).

*Current approach:* No heartbeat endpoint exists in the frozen backend. No heartbeat in MVP. The server's Celery task handles auto-submit. The client re-syncs on every focus event.

*Status:* **NOT IMPLEMENTED — Future Enhancement if presence tracking is needed (e.g., preventing account sharing during live mock exams).**

---

*End of Open Questions.*

---

## Appendix A — MVP vs Future Enhancements Summary

### MVP Implementation (immediately implementable against frozen backend)

- Load and resume full_mock and previous_year attempt types
- Four-option MCQ display (text only)
- All five question states with palette visualization
- Server-authoritative timer (computed from `started_at + duration_seconds`)
- Auto-save with idempotent write
- Offline queue via IndexedDB with reconnect flush
- Page refresh recovery
- Pre-submit confirmation dialog with unanswered count
- Manual submit + immediate score call + redirect to results
- Auto-submit at T=0 (client triggers; server Celery is backstop)
- Mobile bottom sheet palette
- Desktop persistent palette panel
- Section tab navigation
- Timer warnings at 5min and 1min
- ARIA announcements for timer and save state
- Keyboard shortcuts for navigation and option selection
- WCAG 2.1 AA compliance

### Future Enhancements (post-MVP; not in scope now)

- Question images / figures / diagrams
- Practice-type question ordering (requires OQ-03 resolution)
- Multi-correct answer type
- Fill-in-the-blank question type
- Multi-language stem toggle per question
- Virtual scroll for palettes with > 100 questions
- Rich text / markdown rendering for question stems
- Heartbeat / presence endpoint (requires backend addition)
- Server `remaining_seconds` field (requires backend addition — eliminates clock-skew risk)
- Enforced full-screen lock (requires browser Fullscreen API permission UX)
- Time-per-question analytics display during exam
- Player-optimized question endpoint (strip `is_correct`/`explanation` server-side)
- Explain-after-question overlay in practice modes (post-submit)

---

## Appendix B — Traceability to Source Documents

| Architecture decision | Source |
|---|---|
| Server-authoritative timer | PRD v4 §13 (mock player); SAD §4 (frontend), §7 (exam engine); UI/UX §8.7 |
| Not visited/visited/answered/marked/answered_marked states | DB Design `user_answers.state` CHECK constraint |
| Idempotent answer writes | SAD §4; DB Design UNIQUE(attempt_id, question_id) |
| IndexedDB offline buffering | SAD §4 (mock player offline resilience) |
| Never store is_correct on client | PRD v4 §0 (Golden Rules); Architecture constraints |
| Assamese-first i18n | PRD v4 §4.1, §4.6; UI/UX §2.3, §5 |
| colorblind-safe palette | UI/UX §2.2 |
| Mobile bottom tab bar hidden during exam | UI/UX §8.7 ("strips all navigation") |
| `started_at + duration_seconds` timer anchor | DB Design `exam_attempts` schema; frozen API ExamAttemptRead serializer |
| No scoring in frontend | PRD v4 Golden Rules; SAD §3 |
| WCAG AA | PRD v4 §22; UI/UX §6 |

---

*Document version 1.0 — PrepGenius Principal Engineer Architecture Review — 2026-06-02*  
*This document supersedes any prior informal design notes on the Mock Player.*  
*All implementation must align with this document; deviations require an ADR.*
