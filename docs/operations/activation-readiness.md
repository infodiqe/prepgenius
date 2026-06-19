# Activation Readiness Runbook (Sprint 1)

**Owner:** Backend / Ops · **Introduced:** SPR1-CLOSEOUT-01

This runbook makes the Sprint 1 **activation loop** reproducible on a fresh
environment without tribal knowledge, and lets an operator **verify diagnostic
readiness before onboarding pilot users**.

Activation loop:

```
Register → Verify Email → Login → Onboarding → Dashboard
→ Diagnostic → Practice Player → Submit → Diagnostic Completion → Results → Dashboard
```

If the diagnostic content/config is missing, the dashboard **silently hides the
diagnostic card** and the funnel dead-ends. The steps below prevent that.

---

## 1. Required services

| Service | Why it is required for activation |
|---|---|
| `postgres` (pgvector) | System of record; questions/attempts/scoring. |
| `redis` | Celery broker/result backend + rate limiting. |
| `django` (web/API) | Serves `/api/v1/*`. |
| **`celery-worker`** | **Sends the verification email** and runs analytics rollups after scoring. Without it, users never receive a verification email and **cannot log in** (login is hard-gated on `is_email_verified`). |
| `celery-beat` | Auto-submits expired attempts (timer safety). Not strictly required to *start* a diagnostic, but required for correct timer behaviour. |
| **Email/SMTP backend** | Verification + resend emails. Configure real SMTP for the pilot; verification cannot be bypassed. |

> The repo-root `data/` directory must be mounted into the Django container at
> `/app/data` (already configured in `docker-compose.yml`) so `seed_questions`
> can import `data.seeds.*`.

---

## 2. Required seed sequence (run once per fresh DB)

All seed commands are **idempotent**. Use the single orchestrator:

```bash
python manage.py migrate
python manage.py seed_all
```

`seed_all` runs, in dependency order:

1. `seed_roles` — roles/permissions (the `student` role is required for every learner).
2. `seed_ctet` — CTET_P2_SCI exam + subjects/topics/subtopics.
3. `seed_previous_year_papers` — CTET PYP records.
4. `seed_questions` — 125 questions (80 published) + options.
5. `seed_question_approvals` — approvals for published questions.
6. `seed_ctet_diagnostic` — the published CTET diagnostic mock test + question mappings, and `Exam.blueprint.diagnostic_mock_test_id`.

(You may run the six commands individually in the same order; `seed_all` exists
so you don't have to remember it.)

---

## 3. Verify diagnostic readiness (before onboarding users)

Read-only, idempotent, exits non-zero on any failure:

```bash
python manage.py verify_diagnostic_readiness
# optional: --exam-code CTET_P2_SCI
```

It checks: exam exists & active → `blueprint.diagnostic_mock_test_id` set →
diagnostic `MockTest` exists, `type=system`, **published** → has question
mappings → `total_questions` matches the mapping count → **every mapped question
is published** (an unpublished mapped question is silently dropped by the player).

**Expected:** `Diagnostic readiness: ALL CHECKS PASSED.` (exit 0). Any `[FAIL]`
line tells you exactly which prerequisite is missing and which seed to re-run.

---

## 4. Expected successful activation path (what a pilot user experiences)

1. **Register** (with consent checkbox) → "check your email" message.
2. **Verify** via the emailed token → "email verified."
3. **Login** → cookies set.
4. **Onboarding** — no target exam yet → redirected to `/onboarding`; pick exam + date → saved.
5. **Dashboard** — first visit, zero attempts, diagnostic configured → **diagnostic card shows**.
6. **Diagnostic** — "Start Diagnostic" → attempt created+started → enters the player at `/practice/{id}?flow=diagnostic`.
7. **Submit** → auto-scored → **Diagnostic Completion** (`/diagnostic/{id}`).
8. **Results / Dashboard** — "View Full Results" → `/results/{id}`; "Go to Dashboard" → diagnostic card now gone (an attempt exists).

---

## 5. End-to-end validation procedure (pre-pilot, lightweight)

No browser automation. Two complementary checks:

### 5a. Automated attempt-lifecycle regression (CI-friendly)

```bash
cd backend
SECRET_KEY=dev-only pytest attempts/tests/test_registration_to_attempt_flow.py -q
```

Exercises the **real** registration service (student-role assignment) →
create → start → submit (auto-score) → results → analytics, asserting no
`IsStudent` 403 anywhere. Pair with:

```bash
SECRET_KEY=dev-only pytest attempts/tests/test_seed_ctet_diagnostic.py \
  attempts/tests/test_verify_diagnostic_readiness.py -q
```

### 5b. Manual HTTP smoke against a running stack (curl)

Uses a cookie jar; replace `$BASE` with your API base (e.g. `http://localhost:8000/api/v1`).

```bash
BASE=http://localhost:8000/api/v1
JAR=$(mktemp)

# 1) Register
curl -s -X POST $BASE/auth/register/ -H 'Content-Type: application/json' \
  -d '{"full_name":"Pilot User","email":"pilot1@example.com","password":"Str0ng!Pass","password_confirm":"Str0ng!Pass","preferred_language":"en"}'
# → 201 {"detail":"Registration successful..."}

# 2) Get the verification token (pilot: from the email; smoke: from the DB)
python manage.py shell -c "from accounts.models import EmailVerificationToken as T; \
print(T.objects.filter(user__email='pilot1@example.com').latest('id').token)"

# 3) Verify
curl -s -X POST $BASE/auth/verify-email/ -H 'Content-Type: application/json' \
  -d '{"token":"<TOKEN_FROM_STEP_2>"}'
# → 200 {"detail":"Email verified..."}

# 4) Login (store cookies)
curl -s -c $JAR -X POST $BASE/auth/login/ -H 'Content-Type: application/json' \
  -d '{"email":"pilot1@example.com","password":"Str0ng!Pass"}'
# → 200 + Set-Cookie access_token/refresh_token

# 5) Onboarding — set target exam + date (use the CTET exam id from /exams/)
curl -s -b $JAR -X PATCH $BASE/auth/profile/ -H 'Content-Type: application/json' \
  -d '{"target_exam_id":"<CTET_EXAM_ID>","exam_date":"2026-12-01"}'
# → 200 with target_exam_id set

# 6) Read the diagnostic mock test id from the exam blueprint
curl -s -b $JAR $BASE/exams/<CTET_EXAM_ID>/ | grep -o '"diagnostic_mock_test_id":"[^"]*"'

# 7) Create the diagnostic attempt (full_mock + the diagnostic mock id)
curl -s -b $JAR -X POST $BASE/attempts/attempts/ -H 'Content-Type: application/json' \
  -d '{"exam_id":"<CTET_EXAM_ID>","attempt_type":"full_mock","mock_test_id":"<DIAGNOSTIC_MOCK_ID>"}'
# → 201 {"id":"<ATTEMPT_ID>", ...}

# 8) Start, (answer optional), submit
curl -s -b $JAR -X POST $BASE/attempts/attempts/<ATTEMPT_ID>/start/   # → 200 in_progress
curl -s -b $JAR -X POST $BASE/attempts/attempts/<ATTEMPT_ID>/submit/  # → 200 scored

# 9) Results
curl -s -b $JAR $BASE/attempts/attempts/<ATTEMPT_ID>/results/         # → 200
```

A clean pass of 5a + 5b on a freshly seeded, `verify_diagnostic_readiness`-green
environment constitutes activation sign-off.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Dashboard shows no diagnostic card | `blueprint.diagnostic_mock_test_id` missing | Run `seed_ctet_diagnostic` (or `seed_all`); confirm with `verify_diagnostic_readiness`. |
| Player shows "Practice Mode Coming Soon" | attempt has no `mock_test_id` | Ensure launch uses the diagnostic mock id (it does post-SPR1-HOTFIX-02); re-verify readiness. |
| Player loads fewer questions than expected | a mapped question is unpublished (silently dropped) | `verify_diagnostic_readiness` flags this; re-run `seed_ctet_diagnostic`. |
| User never receives verification email / can't log in | `celery-worker` down or SMTP misconfigured | Start the worker; configure the email backend; user can use resend-verification. |
| `start` returns 400 "not published" | diagnostic `MockTest.is_published=False` | Re-run `seed_ctet_diagnostic` (sets published). |
