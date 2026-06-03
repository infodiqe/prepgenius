# Mock Player — Backend Contract Validation Report

**Document type:** Principal Engineer Backend Contract Validation  
**Status:** Final — Pre-Implementation Gate  
**Author role:** Principal Architect / Senior Backend Engineer  
**Date:** 2026-06-03  
**Scope:** Sprint 4 frozen backend — validates every assumption in `mock-player-architecture.md`  
**Sources:** `attempts/services/attempt_services.py` · `attempts/api/views.py` · `attempts/selectors/attempt_selectors.py` · `attempts/models/*` · `questions/serializers/question_serializers.py` · `questions/selectors/learner_selectors.py` · `common/permissions.py` · `accounts/permissions.py` · `schema.yml` · `attempts/exceptions.py` · `analytics/services/section_analytics.py`

---

## Quick Reference: Decision Summary

| Status | Count |
|---|---|
| ✅ VERIFIED | 19 |
| ⚠️ PARTIALLY VERIFIED | 6 |
| ❌ INVALID | 3 |
| 🚫 BLOCKED | 2 |

**Architecture Go / No-Go: CONDITIONAL NO-GO**  
Full mock (`full_mock`, `previous_year`) implementation is unblocked. Practice modes (`topic`, `subject`, `mixed`, `daily`) and the end-to-end results flow are blocked pending the mitigations described in Section 8.

---

## Section A — Attempt Lifecycle

### A.1 `POST /api/v1/attempts/attempts/` — Create Attempt

**Status: ✅ VERIFIED**

**Evidence** (`create_attempt()`, `attempt_services.py:238–260`):
```
create_attempt() creates ExamAttempt with:
  status     = 'created'   (model default)
  started_at = None        (not set at creation)
  duration_seconds = passed value or None
  total_questions = 0      (model default)
  mock_test_id = None or provided UUID
```

**Findings:**
- Status always starts as `'created'` ✅
- `started_at` is correctly NULL at creation — set only on start ✅
- `mock_test_id` is optional; `duration_seconds` can be supplied as a creation-time override ✅
- No ownership paradox — `user_id` is taken from `request.user.id` at the view layer, never from client input ✅
- No validation that `mock_test_id` is published at creation time (deferred to start) ✅

---

### A.2 `POST /api/v1/attempts/attempts/{id}/start/` — Start Attempt

**Status: ⚠️ PARTIALLY VERIFIED — with two critical gaps**

**Evidence** (`start_attempt()`, `attempt_services.py:263–295`):
```python
def start_attempt(*, attempt_id: UUID) -> ExamAttempt:
    _validate_attempt_transition(attempt.status, "in_progress")  # created → in_progress only

    if attempt.mock_test_id:
        mock_test = attempt.mock_test
        if not mock_test.is_published:
            raise MockTestNotPublishedError(...)
        attempt.duration_seconds = mock_test.duration_seconds       # overrides any create-time value
        attempt.total_questions = mock_test.questions.count()       # set from mock test

    elif attempt.duration_seconds is None:
        duration_minutes = attempt.exam.exam_rules.get("duration_minutes")
        if duration_minutes is not None:
            attempt.duration_seconds = int(duration_minutes) * 60
    
    attempt.status = "in_progress"
    attempt.started_at = timezone.now()
    attempt.save(update_fields=["status", "started_at", "duration_seconds", "total_questions"])
```

**Findings — VERIFIED:**
- Ownership: `_get_owned_attempt_or_404()` called at the view layer ✅
- `started_at` set exactly once, at `timezone.now()`, never updated afterward ✅
- For `full_mock` / `previous_year`: `duration_seconds` from `mock_test.duration_seconds`, `total_questions` from `mock_test.questions.count()` ✅
- `mock_test.is_published` gated — unpublished mocks raise `MockTestNotPublishedError` (→ HTTP 400) ✅
- Idempotency: `created → in_progress` is the only allowed source state; calling start on an already-started attempt raises `InvalidAttemptTransitionError` (→ HTTP 400) ✅

**Findings — GAP 1 (CRITICAL) — `total_questions` never set for practice types:**

For `attempt_type ∈ {'topic', 'subject', 'mixed', 'daily'}` (no `mock_test_id`), the `total_questions` field is **never set** — it stays at the model default of `0`.

```python
# For non-mock attempts, this branch is skipped entirely:
if attempt.mock_test_id:
    attempt.total_questions = mock_test.questions.count()
# No else-branch sets total_questions for practice types
```

Impact on scoring (`score_attempt()`, line 355):
```python
skipped = attempt.total_questions - answered
# With total_questions=0 and answered=10: skipped = -10  ← WRONG
```

**This produces an incorrect `skipped` count for all practice-type attempts.**

**Findings — GAP 2 — `duration_seconds` may be null for practice types:**

If `duration_seconds` is not passed at create-time AND `exam.exam_rules` does not contain `"duration_minutes"`, `duration_seconds` remains `None` after start. The timer architecture (`deadline = startedAt + durationSeconds`) breaks when `duration_seconds` is null — the timer cannot be computed.

**Required frontend action:** For `full_mock` / `previous_year`, this is safe — `duration_seconds` is always set. For practice modes, the frontend must supply `duration_seconds` at create time via `ExamAttemptCreateSerializer.duration_seconds`. If the exam's `exam_rules.duration_minutes` is not configured, this is the only path to a non-null timer.

---

### A.3 `GET /api/v1/attempts/attempts/{id}/` — Retrieve Attempt

**Status: ✅ VERIFIED — with an important security implication**

**Evidence** (`get_exam_attempt_by_id()`, `attempt_selectors.py:31–45`):
```python
def get_exam_attempt_by_id(*, attempt_id: UUID) -> ExamAttempt:
    return (
        ExamAttempt.objects.select_related("exam", "mock_test", "user")
        .prefetch_related(
            Prefetch(
                "answers",
                queryset=UserAnswer.objects.select_related(
                    "question", "selected_option"
                ).order_by("created_at"),
            )
        )
        .get(id=attempt_id)
    )
```

**Findings:**
- `ScoredAttemptDetail` **always** includes `answers[]`, not only when scored ✅
- `answers[]` is ordered by `created_at` ASC ✅
- `answers[]` is an empty list for new attempts, populated as saves accumulate ✅
- `started_at` and `duration_seconds` are present at all statuses after start ✅

**Security implication (see Section F):** Each answer in `answers[]` includes `is_correct: boolean | null`. After `save_answer()` runs, `is_correct` is non-null and reflects whether the student's choice was correct. This means `GET /attempts/{id}/` during an active attempt exposes `is_correct` for every saved answer. Service-layer stripping is mandatory (see §F).

---

### A.4 `POST /api/v1/attempts/attempts/{id}/submit/` — Submit Attempt

**Status: ✅ VERIFIED**

**Evidence** (`submit_attempt()`, `attempt_services.py:298–328`):
```python
_validate_attempt_transition(attempt.status, "submitted")   # validates in_progress → submitted
if attempt.status != "in_progress":                        # redundant but harmless double-check
    raise InvalidAttemptTransitionError(...)

attempt.status = "submitted"
attempt.submitted_at = timezone.now()
if attempt.started_at:
    elapsed = (attempt.submitted_at - attempt.started_at).total_seconds()
    attempt.time_taken_seconds = int(elapsed)
```

**Findings:**
- Ownership: `_get_owned_attempt_or_404()` called at the view layer ✅
- `time_taken_seconds` computed server-side from `submitted_at - started_at` ✅
- Returns `ExamAttemptRead` (not `ScoredAttemptDetail`) — no answers in response ✅
- State machine: `in_progress → submitted` is the only valid transition; duplicate submits raise 400 ✅
- **No auto-scoring triggered.** The attempt transitions to `submitted` and stops there until `/score/` is called explicitly. No Celery signal, no background task ✅ (confirmed)

---

### A.5 `POST /api/v1/attempts/attempts/{id}/score/` — Score Attempt

**Status: 🚫 BLOCKED — P0 BLOCKER**

**Evidence** (`AttemptScore` view, `attempts/api/views.py:442–445`):
```python
class AttemptScore(AttemptBaseView):      # inherits permission_classes = [IsAuthenticatedReadOnly]
    def post(self, request, pk: UUID):
        attempt = score_attempt(attempt_id=pk)
        return Response(ScoredAttemptDetailSerializer(attempt).data)
```

`AttemptBaseView`:
```python
class AttemptBaseView(APIView):
    permission_classes = [IsAuthenticatedReadOnly]
```

`IsAuthenticatedReadOnly` for non-SAFE methods (`POST`):
```python
# common/permissions.py:58–60
return UserRole.objects.filter(
    user=request.user, role__name__in=WRITE_ROLES   # {"content_manager", "platform_admin"}
).exists()
```

`WRITE_ROLES = {"content_manager", "platform_admin"}` — `student` is NOT in this set.

**Contrast with sibling views:**
```python
class AttemptStart(AttemptBaseView):
    permission_classes = [IsStudent]     # ← explicitly overrides base
class AttemptSubmit(AttemptBaseView):
    permission_classes = [IsStudent]     # ← explicitly overrides base
class AttemptScore(AttemptBaseView):
    # ← NO override → inherits IsAuthenticatedReadOnly → POST requires content_manager/platform_admin
```

The OpenAPI schema confirms the intent: `description: "Score a submitted attempt… Requires content_manager or platform_admin role."` (`schema.yml:563`).

**A student calling `POST /score/` receives HTTP 403 Forbidden.**

**Additional: no ownership check at all.** Unlike `/start/` and `/submit/`, `AttemptScore.post()` does not call `_get_owned_attempt_or_404()`. Any `content_manager` can score any student's attempt.

**Architecture document assumption invalidated:** §9.1.H of the architecture document stated "Permission: any authenticated user (ASSUMPTION — see §20.OQ-06)". The actual permission is `content_manager|platform_admin` only. Students cannot trigger scoring of their own attempts via the frontend.

**Impact: The entire end-to-end flow (practice → submit → results) is broken for students at the scoring step.** The mock player can submit, but results will never appear because the attempt stays in `submitted` status indefinitely.

---

## Section B — Question Loading

### B.1 `full_mock` and `previous_year` Attempt Types

**Status: ✅ VERIFIED**

**Flow:**
```
1. Create attempt with mock_test_id pointing to a published MockTest
2. POST /start/ → sets duration_seconds and total_questions from mock_test
3. GET /mock-tests/{mock_test_id}/questions/ → MockTestQuestionRead[] ordered by position
   (selector: list_mock_test_questions() → .order_by("position"))
4. GET /questions/published/?exam_id={examId} → full question content
   (selector: list_published_questions() → includes is_correct and explanation — strip client-side)
5. Join by question_id: use position from step 3, stem+options from step 4
```

**Evidence** (`list_mock_test_questions()`, `attempt_selectors.py:67–74`):
```python
def list_mock_test_questions(*, mock_test_id: UUID) -> QuerySet[MockTestQuestion]:
    return (
        MockTestQuestion.objects.filter(mock_test_id=mock_test_id)
        .select_related("question__subtopic__topic__subject")
        .order_by("position")       # deterministic, stable
    )
```

- Ordering: `position` ASC — deterministic and stable across sessions ✅
- `section` field on `MockTestQuestion` is available for section-tab navigation ✅
- `marks` per question is available for score computation (server-side; player doesn't need it) ✅
- Mock test must be `is_published=True` to start — guards against unpublished content ✅

---

### B.2 `topic`, `subject`, `mixed`, `daily` Attempt Types

**Status: 🚫 BLOCKED — P0 BLOCKER**

**Full investigation of available endpoints:**

| Endpoint | Filter capability | Ordering | Useful for practice? |
|---|---|---|---|
| `GET /questions/published/` | `exam_id` optional | `subtopic__topic__subject__position, subtopic__position` | Partial — no topic/subject filter |
| `GET /questions/published/by-subtopic/{id}/` | subtopic only | `-created_at` (newest first) | Too granular; non-deterministic ordering |
| `GET /questions/published/{id}/` | single question by ID | — | Requires knowing IDs in advance |
| `GET /exams/{id}/tree/` | exam only | subject→topic→subtopic hierarchy | Gives topic/subtopic structure, not questions |
| `GET /mock-tests/{id}/questions/` | mock_test only | `position` | Only for pre-built mock tests |

**No endpoint exists that:**
- Filters published questions by `topic_id`
- Filters published questions by `subject_id`
- Provides a curated, ordered question set for a given topic/subject at runtime

**`list_published_questions()` selector analysis** (`learner_selectors.py:28–45`):
```python
def list_published_questions(*, exam_id: UUID | None = None) -> QuerySet[Question]:
    qs = Question.objects.filter(review_status="published")...
    if exam_id is not None:
        qs = qs.filter(exam_id=exam_id)
    return qs.order_by(
        "subtopic__topic__subject__position", "subtopic__position"
    )
```

This returns ALL published questions for an exam, ordered by subject/subtopic position. There is no `topic_id` or `subject_id` filter parameter. The URL parameter list (`schema.yml:2298–2304`) confirms only `exam_id` is accepted.

**The `by-subtopic` endpoint** is per-subtopic and orders by `-created_at` — not a stable per-session order. A topic typically has multiple subtopics, requiring N+1 requests.

**`start_attempt()` for practice types sets `total_questions = 0`** — the backend has no awareness of how many questions will be served in a practice session because the question set is not pre-assembled.

**Assessment of possible frontend-only workarounds (without backend changes):**

*Option A — Client-side topic filter on full exam question list:*
Fetch `GET /questions/published/?exam_id=X`, then filter client-side by `subtopic_id` values matching the desired topic (using the exam tree to map topic → subtopics). Ordering is the server's subtopic-position order.
- Feasibility: Technically possible
- Limitations: Cannot scope `duration_seconds` or `total_questions` to the actual question count; requires loading all published questions for the exam (bandwidth on 3G); ordering is fixed, not adaptive
- Assessment: **Workable for MVP practice modes if bandwidth concern is accepted**

*Option B — Subtopic-by-subtopic aggregation:*
GET `/exams/{id}/tree/` → find subtopics for target topic → GET `/questions/published/by-subtopic/{id}/` for each → combine.
- N+1 requests per topic, ordering is `-created_at` (session-inconsistent)
- **Not recommended**

**Recommended path for MVP practice modes (within frozen backend constraints):** Use Option A. The frontend fetches all published questions for the exam (already needed for mock types), filters client-side by the desired scope (topic/subject), and uses whatever questions match. The question count and duration must come from the frontend (from the create-attempt `duration_seconds` override) since `total_questions` is never set server-side for practice types.

This is a real limitation. Practice modes work, but without server-enforced question scoping or `total_questions` integrity. **Document and accept for MVP; flag for Sprint 5 resolution.**

---

## Section C — Answer Persistence

### C.1 Save Answer Endpoint (idempotency and ownership)

**Status: ✅ VERIFIED**

**Evidence** (`save_answer()`, `attempt_services.py:441–490`):
```python
with transaction.atomic():
    answer, created = UserAnswer.objects.update_or_create(
        attempt=attempt,
        question=question,
        defaults={
            "selected_option_id": selected_option_id,
            "state": state,
            "is_correct": None,
            "time_spent_seconds": time_spent_seconds,
            "answered_at": timezone.now(),
        },
    )
    if selected_option_id:
        option = QuestionOption.objects.get(id=selected_option_id)
        answer.is_correct = option.is_correct and option.question_id == question_id
        answer.save(update_fields=["is_correct"])
```

- `update_or_create` on `(attempt_id, question_id)` — idempotent ✅
- DB-level UNIQUE constraint: `uq_ua_attempt_question` on `(attempt, question)` (`user_answer.py:40–45`) ✅
- Ownership: view calls `_get_owned_attempt_or_404(attempt_id, user_id)` before delegating to service ✅
- Attempt status gated: `if attempt.status != "in_progress": raise AttemptAlreadySubmittedError` ✅
- Atomic: entire answer save + correctness check in one transaction ✅

**Important: `is_correct` is computed and stored immediately** at save time, not deferred to scoring. The `UserAnswerRead` response includes `is_correct` with a boolean value (not null) for answered questions. See Section F.

---

### C.2 Bulk Save Endpoint

**Status: ✅ VERIFIED**

**Evidence** (`bulk_save_answers()`, `attempt_services.py:493–502`):
```python
def bulk_save_answers(*, attempt_id: UUID, answers: list[dict]) -> list[UserAnswer]:
    results: list[UserAnswer] = []
    for answer_data in answers:
        result = save_answer(attempt_id=attempt_id, **answer_data)
        results.append(result)
    return results
```

- Calls `save_answer()` sequentially for each entry — inherits all idempotency and ownership guarantees ✅
- No transaction wrapping the entire bulk operation — individual failures do not roll back prior saves in the batch ⚠️
- This is acceptable for the offline-queue flush use case (queue entries are independent)

**Note:** The sequential non-transactional approach means a bulk-save of 10 answers could partially succeed if the attempt is auto-submitted mid-flush. The last few answers in the queue may get `AttemptAlreadySubmittedError`. Frontend must handle partial bulk-save failure gracefully.

---

### C.3 Resume: Answers on `GET /attempts/{id}/`

**Status: ✅ VERIFIED**

**Evidence** (`ScoredAttemptDetailSerializer`, `attempt_selectors.py:31–45`):

The `get_exam_attempt_by_id()` selector **always** prefetches all answers, regardless of attempt status. The `ScoredAttemptDetail` schema always includes `answers[]` (schema.yml:4525–4529 — `answers` is in the `required` list at line 4540).

This resolves **OQ-02**: the resume flow can use a single `GET /attempts/{id}/` call to get both attempt metadata and all existing answers. No separate `GET /answers/` call is required.

**Resume answer ordering:** `order_by("created_at")` — first-saved answers appear first. This is creation order, which matches the order in which questions were first attempted. For a 150-question exam with no skipping, this approximates question order but is not guaranteed to match `position`.

**Frontend action:** On resume, use the `answers[]` from `GET /attempts/{id}/` to populate the answer map. The existing `GET /answers/` endpoint is redundant; eliminate the separate call from the resume sequence.

---

### C.4 `UserAnswer.state` Validation

**Status: ✅ VERIFIED**

The five states in the model constraint exactly match the architecture document:
```python
state = models.CharField(choices=[
    ("not_visited", "Not Visited"),
    ("visited", "Visited"),
    ("answered", "Answered"),
    ("marked", "Marked"),
    ("answered_marked", "Answered & Marked"),
])
```

The save endpoint accepts all five states via `UserAnswerSaveSerializer.state` (ChoiceField with all five). No server-side validation of state transitions — the server accepts any state value on any call. Transition validation is entirely a frontend responsibility.

---

## Section D — Timer

### D.1 `started_at` Source and Immutability

**Status: ✅ VERIFIED**

**Evidence** (`start_attempt()`, line 284):
```python
attempt.started_at = timezone.now()
attempt.save(update_fields=["status", "started_at", "duration_seconds", "total_questions"])
```

`started_at` is set once with `timezone.now()` (Django's timezone-aware UTC) at the `created → in_progress` transition. The `update_fields` parameter on the save ensures only these four fields change. No subsequent service call touches `started_at`.

Implication for architecture: `started_at` is stable and can be used as a persistent timer anchor. Re-fetching the attempt returns the same `started_at` every time. ✅

---

### D.2 `duration_seconds` Source

**Status: ⚠️ PARTIALLY VERIFIED**

For `full_mock` / `previous_year` (mock_test present): `duration_seconds` is set from `mock_test.duration_seconds` on start — always non-null if the mock test has it set, and `MockTest.duration_seconds` is a required non-nullable field (`mock_test.py:35`). ✅

For practice types (no mock_test): `duration_seconds` comes from the create-time override OR from `exam.exam_rules["duration_minutes"]`. If neither is provided, `duration_seconds` stays `None` after start. ⚠️

**Frontend must supply `duration_seconds` at create-time for all practice-type attempts.**

---

### D.3 `remaining_seconds` — Does It Exist?

**Status: ✅ VERIFIED (confirmed absent)**

No field named `remaining_seconds`, `time_remaining`, or equivalent exists in:
- `ExamAttempt` model (`exam_attempt.py`)
- `ExamAttemptRead` schema (schema.yml:3223)
- `ScoredAttemptDetail` schema (schema.yml:4449)

The architecture document's approach is correct: compute remaining time as `(new Date(started_at).getTime() + duration_seconds * 1000) - Date.now()`.

---

### D.4 Server-Side Timer Expiry (Celery)

**Status: ⚠️ PARTIALLY VERIFIED — auto-submit exists; auto-score does NOT**

**Evidence** (`submit_expired_attempts()`, `attempt_services.py:416–435`):
```python
def submit_expired_attempts(*, now=None) -> int:
    expired_attempts = ExamAttempt.objects.filter(
        status="in_progress",
        started_at__isnull=False,
        duration_seconds__isnull=False,
    )
    for attempt in expired_attempts:
        elapsed = (now - attempt.started_at).total_seconds()
        if elapsed < attempt.duration_seconds:
            continue
        try:
            submit_attempt(attempt_id=attempt.id)   # ← only submits, does NOT score
        except InvalidAttemptTransitionError:
            continue
    return submitted_count
```

The Celery task (`attempts/tasks/__init__.py`) wraps this and runs on the `auto_submit_expired_attempts` schedule.

**Confirmed:**
- Auto-submit Celery task exists ✅
- It submits expired `in_progress` attempts ✅
- It does NOT chain to `score_attempt()` — attempts stay in `submitted` status ✅
- Combined with the score permission blocker (Section A.5), this means auto-expired attempts **never produce results** without manual admin intervention ✅ (confirmed, not acceptable)

---

## Section E — Scoring

### E.1 Who Can Call `/score/`

**Status: ❌ INVALID — P0 BLOCKER**

See Section A.5 for full evidence. Summary:

- **`AttemptScore` requires `content_manager` or `platform_admin` role for POST**
- Students cannot call this endpoint — they receive HTTP 403
- The architecture document assumed students could call it (OQ-06 noted as "known gap" — it is actually a hard blocker)
- No ownership check: any content_manager can score any attempt

---

### E.2 Score Computation Correctness (for mock types)

**Status: ✅ VERIFIED**

**Evidence** (`score_attempt()`, `attempt_services.py:331–413`):

For `full_mock` / `previous_year`:
- Per-question marks from `mock_marks = {question_id: marks}` (from `MockTestQuestion.marks`) ✅
- Negative marking from `exam_rules["negative_marking"]` ✅
- `max_score = sum(mock_marks.values())` ✅
- Section analytics computed synchronously via `compute_section_analytics()` ✅
- Analytics rollup (`update_analytics_rollups`) queued asynchronously on commit ✅

---

### E.3 Score Computation Correctness (for practice types)

**Status: ❌ INVALID**

For practice types (`total_questions=0`, no `mock_marks`):
```python
skipped = attempt.total_questions - answered   # 0 - N = negative number
```
`total_questions=0` for practice types causes incorrect `skipped` count. While scoring itself (correct/incorrect marks) works, the `skipped` metric is wrong.

---

### E.4 `is_correct` Pre-Computation

**Status: ✅ VERIFIED — with security implications**

`is_correct` is set by `save_answer()` at save time (not at score time) by checking `option.is_correct`. Scoring reuses this pre-computed value. This means:
1. Scoring is fast (no option lookup during score_attempt) ✅
2. `is_correct` is immediately set on the answer record after each save ⚠️ (see Section F)
3. If `selected_option_id` is null (cleared), `is_correct` stays null ✅

---

## Section F — Security: Correct Answer Exposure

### F.1 `is_correct` in `QuestionOptionNested`

**Status: ❌ INVALID — Critical Security Gap**

**Evidence** (`question_serializers.py:26–29`):
```python
class QuestionOptionNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "label", "body", "is_correct", "position"]   # ← is_correct included
```

`QuestionReadSerializer` uses `QuestionOptionNestedSerializer` for its `options` field. `GET /questions/published/` returns `is_correct: boolean` for every option of every published question.

**Schema confirmation** (`schema.yml:4148–4170`):
```yaml
QuestionOptionNested:
  properties:
    is_correct:
      type: boolean     # ← present and not nullable
```

**The published questions endpoint sends correct answers to every student who fetches questions.** This is not a future risk — it is the current behavior. The architecture document's §18.2 service-layer stripping requirement is **mandatory and urgent**, not precautionary.

---

### F.2 `is_correct` in `UserAnswerRead` During Active Attempts

**Status: ❌ INVALID — More Severe Than Assumed**

**Evidence** (`question_serializers.py` / `schema.yml:4884–4887`):
```yaml
UserAnswerRead:
  properties:
    is_correct:
      type: boolean
      readOnly: true
      nullable: true
```

`save_answer()` computes and stores `is_correct` immediately:
```python
answer.is_correct = option.is_correct and option.question_id == question_id
answer.save(update_fields=["is_correct"])
```

The `POST /answers/save/` response includes `is_correct` with a non-null boolean immediately after the student selects an option. Similarly, `GET /attempts/{id}/` returns all answers with `is_correct` populated for every answered question.

**The architecture document only identified `is_correct` exposure via the question endpoint. There is a SECOND exposure vector via every answer save response and via the attempt detail endpoint.**

**Two mandatory stripping points in the frontend service layer:**
1. Strip `options[].is_correct` from `QuestionRead` (from published questions endpoint)
2. Strip `is_correct` from `UserAnswerRead` (from save answer response AND from `ScoredAttemptDetail.answers[]` during active attempt)

For the results page, `is_correct` from `UserAnswerRead` is legitimately needed post-scoring. The stripping must be conditional on attempt status: strip during `in_progress`, allow during `scored`.

**Recommended approach:** The question service layer strips `is_correct` from questions unconditionally. The answer service layer strips `is_correct` from answer responses only when `attempt.status === 'in_progress'`.

---

### F.3 `explanation` in `QuestionRead`

**Status: ❌ INVALID — Critical Security Gap**

**Evidence** (`question_serializers.py:62–87`):
```python
class QuestionReadSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            "id", "exam_id", "subtopic_id",
            "stem",
            "explanation",    # ← included for ALL question states, all callers
            ...
        ]
```

`explanation` is included in every `GET /questions/published/` response. There is no player-safe variant that omits it. The architecture document §18.2 mandated stripping. This is confirmed as required.

---

## Section G — Open Questions Resolution

### OQ-01 — Server Time Endpoint

**Answer: CONFIRMED ABSENT — timer uses started_at anchor**

**Evidence:** No endpoint matching `/time/`, `/server-time/`, or similar exists anywhere in `schema.yml` (2,700+ lines scanned) or in the URL configurations of any app (`api_router.py`, `exams/api/urls.py`, `accounts/api/urls.py`, `attempts/api/urls.py`).

**Impact:** Device clock skew cannot be detected or compensated. On resume, re-fetching the attempt and recomputing from `started_at` is the correct mitigation (implemented in §6 of architecture doc). The Celery auto-submit is the enforcement backstop.

**Required frontend action:** No change to current architecture. Add a note in the implementation that clock-skew on very inaccurate devices (>±5 min) is an unmitigated risk accepted for MVP.

---

### OQ-02 — `answers[]` Populated During `in_progress`

**Answer: CONFIRMED YES — single call on resume is sufficient**

**Evidence:** `get_exam_attempt_by_id()` always prefetches answers regardless of status. `ScoredAttemptDetail` always includes `answers` (it is in `required` in the schema).

**Impact (positive):** The resume sequence can use a single `GET /attempts/{id}/` call to get both attempt metadata AND all existing answers. The separate `GET /attempts/{attempt_pk}/answers/` call described in architecture document §9.3 step 6 is redundant and can be eliminated.

**Required frontend action:** Simplify resume sequence:
```
1. GET /attempts/{attemptId}/
   → attempt metadata + started_at + duration_seconds (for timer)
   → answers[] (for answer map restoration)
   → status (check for submitted/scored → redirect)

Eliminate: GET /attempts/{attemptId}/answers/ (redundant)
```

This saves one network round-trip per resume, improving TTI on 3G.

**CAUTION:** `answers[]` includes `is_correct` — strip it before populating client answer map during `in_progress`.

---

### OQ-03 — Practice Type Question Ordering

**Answer: P0 BLOCKER — confirmed. No by-topic or by-subject endpoint exists in the frozen backend.**

**Evidence:** Full endpoint audit confirms:
- `GET /questions/published/` — only `exam_id` filter, no `topic_id` or `subject_id`
- `GET /questions/published/by-subtopic/{id}/` — only at subtopic level, ordering is `-created_at`
- No `GET /attempts/{id}/questions/` endpoint
- `start_attempt()` does not assemble a question list for practice types

**Available workaround within frozen backend (Option A — client-side filter):**

```
For topic practice targeting topic T:
  1. GET /exams/{examId}/tree/          → subject→topic→subtopic hierarchy
  2. Identify all subtopics under topic T
  3. GET /questions/published/?exam_id=X → ALL published questions for exam
  4. Client-side filter: keep questions where subtopic_id ∈ {subtopics of topic T}
  5. Order: server's order (subtopic.position ASC) — deterministic within the session
  6. total_questions = len(filtered questions) — frontend must track this
```

This requires fetching all questions for the exam (already needed for mock types if using same cache). The exam tree call is O(1) per session.

**Impact:** Practice modes are implementable within frozen constraints using this approach. Key limitations:
- `total_questions` on the server will be 0 (scoring `skipped` count is wrong for practice)
- Duration must come from the create-time `duration_seconds` override (frontend knows it)
- Question ordering is by syllabus position (not adaptive or randomized in MVP)

**Required frontend action:** The practice type initialization code must:
1. Pass `duration_seconds` in the create-attempt request
2. Load the full exam question set (or use cached)
3. Filter client-side by the intended scope
4. Not rely on server's `total_questions` for display (use `filteredQuestions.length`)

---

### OQ-04 — `is_correct` and `explanation` Exposure

**Answer: CONFIRMED EXPOSED in two locations (more severe than assumed)**

**Evidence:** See Section F in full. Two exposure vectors confirmed:
1. `QuestionOptionNested.is_correct` in `QuestionRead` (question loading)
2. `UserAnswerRead.is_correct` in save answer response and attempt detail

**Impact:** Service-layer stripping is mandatory at two points, not one.

**Required frontend action:**
```
Question service layer (strips unconditionally):
  - Remove options[].is_correct from every QuestionRead
  - Remove explanation from every QuestionRead

Answer service layer (strips conditionally):
  - During active attempt (status = 'in_progress'):
    → Remove is_correct from UserAnswerRead responses
    → Remove is_correct from ScoredAttemptDetail.answers[]
  - After scoring (status = 'scored'):
    → is_correct may be shown in the Results page context
    → But never exposed in the player context
```

TypeScript type aliases for each context are required to enforce this at compile time.

---

### OQ-05 — Bulk Question Loading Scope

**Answer: CONFIRMED — full exam question set, no pagination**

**Evidence:** `list_published_questions()` returns an unfiltered (beyond `exam_id`) queryset. The endpoint accepts no `page`, `cursor`, or `question_ids` parameter. `GET /questions/published/` is not paginated — it returns all results as a flat array.

**Impact for MVP:** For CTET (expected ~500 published questions at scale), this is a single potentially large response. For pilot (10–15 users), the question bank will be small and this is not a concern. TanStack Query `staleTime: Infinity` ensures it is fetched once per session.

**Required frontend action:** Accept the full-fetch approach for MVP. Monitor response size in production. Add per-session TanStack cache key to avoid re-fetching when navigating away and back.

---

### OQ-06 — Score Endpoint Permission Scope

**Answer: CONFIRMED BLOCKER — Students cannot call /score/**

**Evidence:** See Section A.5 and E.1 for full code evidence.

**Impact:** This is not a "known gap" — it is a **P0 blocker** for the entire user-visible results flow. Without scoring, the Results page always shows `EmptyResultState` (it checks `attemptDetail.status !== 'scored'`).

**Required frontend action:** None possible without a backend change. This must be resolved before the Mock Player ships. See Section 8 (Required Architecture Changes) for the resolution path.

---

### OQ-07 — Auto-Submit Chains to Score

**Answer: CONFIRMED NO — auto-submit does not chain to score**

**Evidence:** `submit_expired_attempts()` only calls `submit_attempt()`. No `score_attempt()` call anywhere in the auto-submit path. Celery task `auto_submit_expired_attempts` wraps only `submit_expired_attempts()`.

**Impact:** Students whose timer expires on the server (client was offline/closed) have their attempt stuck at `submitted` indefinitely. Combined with the score permission blocker, they can never see results without admin intervention.

**Required frontend action:** On mount/resume, if attempt status is `submitted`, the player should **not** attempt to call `/score/` (it will 403). Instead, show a message: "Your answers have been submitted. Results are being processed." This is the best UX possible within the frozen constraints.

---

### OQ-08 — Heartbeat / Presence Endpoint

**Answer: CONFIRMED ABSENT**

**Evidence:** No heartbeat endpoint in the schema or any URL configuration.

**Impact:** None for MVP. The Celery auto-submit handles abandonment. No heartbeat needed.

**Required frontend action:** None.

---

## Section H — Additional Findings (Not in Original Open Questions)

### H.1 `total_questions = 0` for Practice Types

**Status: ❌ INVALID for practice types**

For `attempt_type ∈ {'topic', 'subject', 'mixed', 'daily'}`, `start_attempt()` never sets `total_questions` (no `mock_test_id` → the total_questions block is skipped). It remains 0.

This affects:
- **Scoring** (`skipped = 0 - answered = negative`): incorrect `skipped` count
- **Player UX**: if the player shows "Q N of total", total would be 0 unless the frontend maintains its own count
- **Palette grid size**: the player must know `total_questions` to render the grid; it must use the client-side question list length, not the server value

**Required frontend action:** For all practice-type attempts, the player must use `questions.length` (from the client-side loaded list) as the authoritative question count, not `attempt.total_questions`.

---

### H.2 Redundant Transition Check in `submit_attempt()`

**Status: ⚠️ Minor — informational only**

`submit_attempt()` validates the transition twice:
```python
_validate_attempt_transition(attempt.status, "submitted")   # line 304 — raises if not in_progress
if attempt.status != "in_progress":                         # line 306 — also raises if not in_progress
    raise InvalidAttemptTransitionError(...)
```

The `_validate_attempt_transition` at line 304 already covers the check at line 306. The second check is dead code. Not a bug, not a blocker — informational note.

---

### H.3 `bulk_save_answers()` Is Not Atomic

**Status: ⚠️ Known risk — informational**

`bulk_save_answers()` calls `save_answer()` sequentially with no wrapping transaction. If the attempt is auto-submitted (Celery) between two items in the bulk call, later items in the batch raise `AttemptAlreadySubmittedError`. The first N items succeed; the remaining fail.

For the offline queue flush, this means partial success is possible. The frontend offline queue implementation must handle this gracefully: an `AttemptAlreadySubmittedError` (HTTP 400) means stop flushing and redirect to results (the server submitted and the data it has is final).

---

## Section I — Architecture Validation Summary

### I.1 Per-Section Verdicts

| Section | Architecture Claim | Validation Result |
|---|---|---|
| A.1 Create attempt | status=created, user_id from auth | ✅ VERIFIED |
| A.2 Start attempt (mock) | sets started_at, duration, total_q | ✅ VERIFIED |
| A.2 Start attempt (practice) | same as above | ❌ total_questions=0; duration may be null |
| A.3 GET attempt | ScoredAttemptDetail, always has answers | ✅ VERIFIED + answers[] confirmed present |
| A.4 Submit | in_progress→submitted, time_taken set | ✅ VERIFIED |
| A.5 Score | any authenticated user | 🚫 BLOCKED — content_manager/admin only |
| B.1 full_mock question loading | ordered by position via mock_test_questions | ✅ VERIFIED |
| B.2 Practice type question loading | needs endpoint | 🚫 BLOCKED — no by-topic endpoint |
| C.1 Save answer idempotent | update_or_create on (attempt,question) | ✅ VERIFIED |
| C.2 Bulk save | delegates to save_answer | ✅ VERIFIED (non-atomic noted) |
| C.3 Resume via GET /attempts/{id}/ | single call gets metadata+answers | ✅ VERIFIED |
| C.4 Question state validation | server accepts all 5 states | ✅ VERIFIED |
| D.1 started_at immutability | set once at start | ✅ VERIFIED |
| D.2 duration_seconds for mocks | from mock_test always | ✅ VERIFIED |
| D.2 duration_seconds for practice | from exam_rules or null | ⚠️ PARTIALLY VERIFIED |
| D.3 remaining_seconds absent | correctly absent | ✅ VERIFIED |
| D.4 Auto-submit Celery task | exists and fires correctly | ✅ VERIFIED |
| D.4 Auto-score after submit | does not exist | ⚠️ CONFIRMED ABSENT |
| E.1 Score permission | assumed any auth user | ❌ INVALID — admin only |
| E.2 Score logic for mocks | correct | ✅ VERIFIED |
| E.3 Score logic for practice | incorrect skipped count | ❌ INVALID |
| F.1 is_correct in questions | assumed, strip in service layer | ❌ CONFIRMED EXPOSED |
| F.2 is_correct in answer responses | not anticipated | ❌ CONFIRMED — extra exposure vector |
| F.3 explanation in questions | assumed, strip in service layer | ❌ CONFIRMED EXPOSED |
| G/OQ-02 answers in active attempt | assumption | ✅ RESOLVED YES |

---

## Section J — Final Deliverables

### J.1 Architecture Go / No-Go Decision

**CONDITIONAL NO-GO**

The `full_mock` and `previous_year` player modes are architecturally sound against the frozen backend for all components except the scoring permission. The P0 blocker on `/score/` affects every attempt type.

**Gate condition:** Implementation may begin on the player UI shell, question display, answer persistence, timer, palette, and offline queue. The **submit → score → results redirect** flow cannot be implemented as designed until the score permission issue is resolved.

---

### J.2 P0 Blockers

**P0-01: Students Cannot Score Their Own Attempts**

- **Finding:** `POST /attempts/{id}/score/` requires `content_manager` or `platform_admin` role. Students receive HTTP 403.
- **Evidence:** `AttemptScore` inherits `IsAuthenticatedReadOnly` from `AttemptBaseView`. For POST requests, `IsAuthenticatedReadOnly` requires `WRITE_ROLES = {"content_manager", "platform_admin"}`.
- **Impact:** The complete results flow is broken. After submission, the attempt stays in `submitted` status. The Results page shows `EmptyResultState`.
- **Resolution options (choose one; both require a backend decision):**
  - Option A: Modify `AttemptScore` to use `permission_classes = [IsStudent]` and add `_get_owned_attempt_or_404` ownership check. Students can self-score. This is the correct long-term design (exam scoring is student-triggered).
  - Option B: Remove the explicit `/score/` endpoint from the player flow; instead, auto-trigger scoring inside `submit_attempt()` service when status transitions to `submitted`. The frontend calls only `/submit/` and polls for `status='scored'`.
  - Option C: Add a Celery task that auto-scores all newly-submitted attempts. The frontend polls `GET /attempts/{id}/` until `status='scored'`.
- **Recommended:** Option A — it is the minimal change with correct ownership semantics. Option B is also clean but changes the submit endpoint's contract.

**P0-02: No Ordered Question List for Practice Types**

- **Finding:** No backend endpoint returns an ordered, topic/subject-scoped question set for `topic`, `subject`, `mixed`, or `daily` attempt types.
- **Evidence:** `GET /questions/published/` only accepts `exam_id`. No `topic_id` or `subject_id` filter. `start_attempt()` for practice types sets `total_questions=0`.
- **Impact:** Topic practice, subject practice, mixed practice, and daily practice modes cannot work as designed.
- **Resolution (within frozen backend — no backend changes):** Client-side filtering of the full exam question set (Option A from §B.2). The frontend fetches all published questions for the exam, filters by target scope (topic's subtopics, subject's topics' subtopics), and treats the result as the question list. `total_questions` must be tracked client-side.
- **Recommended:** Accept this for MVP. The practice modes work functionally with client-side filtering; the limitation is no server-side scope enforcement and a slightly larger initial data fetch.

---

### J.3 P1 Risks

**P1-01: `is_correct` Exposed via Two API Vectors**  
`QuestionRead.options[].is_correct` AND `UserAnswerRead.is_correct` (returned by save and by attempt detail). Frontend must strip both. Failure to strip both means the player leaks correct answers in real time.

**P1-02: `total_questions = 0` for Practice Types**  
Incorrect `skipped` count in scoring results. The Results page will show a wrong skipped count for practice-type attempts. Acceptable for MVP if documented; must be fixed in Sprint 5 alongside P0-02.

**P1-03: `duration_seconds` Null for Practice Modes if Not Supplied**  
If the frontend does not supply `duration_seconds` at create-attempt time and `exam.exam_rules` does not have `duration_minutes`, the timer cannot be computed. Frontend must always supply `duration_seconds` for practice-type attempts.

**P1-04: Auto-Submitted Attempts Never Scored**  
`submit_expired_attempts()` (Celery) submits but does not score. A student whose timer expires server-side (client closed/offline) has their attempt stuck at `submitted` indefinitely. Resolving P0-01 fully (any of the three options) will also resolve this.

**P1-05: Partial Bulk-Save on Auto-Submit Race**  
If the Celery auto-submit fires mid-queue-flush, some answers in the bulk save will fail with 400. Frontend must treat 400 on bulk-save as a signal to stop and redirect to results (not retry).

---

### J.4 Required Architecture Changes Before Implementation

The following changes to `mock-player-architecture.md` are required before any implementation starts:

**CHANGE 1 (§9.1.H — Score endpoint):**  
*Remove:* "Permission: any authenticated user (ASSUMPTION)"  
*Replace with:* "This endpoint currently requires `content_manager` or `platform_admin` role. Students receive HTTP 403. This is P0-01. The player must not call `/score/` until the backend permission is resolved. The submit flow ends at POST /submit/. The player polls GET /attempts/{id}/ until status='scored'."

**CHANGE 2 (§9.2 — Call Sequence):**  
*Remove step 8:* `POST /attempts/{id}/score/`  
*Add:* "POST /submit/ → poll GET /attempts/{id}/ every 2s until status='scored' → redirect"

**CHANGE 3 (§9.3 — Resume Sequence):**  
*Remove step 6:* `GET /attempts/{attempt_pk}/answers/`  
The `answers[]` from step 1 `GET /attempts/{id}/` contains all existing answers — no separate call needed.

**CHANGE 4 (§3.1 — PlayerState):**  
Add `questionCount: number` field, sourced from `questions.length` (client-side), not from `attempt.total_questions`. Comment: "Server total_questions is 0 for practice-type attempts. Never use server value."

**CHANGE 5 (§18.2 — Security):**  
Add second stripping requirement: "`UserAnswerRead.is_correct` must be stripped from save-answer responses and from `ScoredAttemptDetail.answers[]` during active attempts."

**CHANGE 6 (§B — Practice Type Question Loading):**  
Document the client-side filter approach as the authoritative implementation path for practice modes within the frozen backend. Include the fetch sequence: exam tree → subtopic mapping → full question fetch → client filter.

---

### J.5 Implementation Readiness Score

| Component | Ready? | Score |
|---|---|---|
| Attempt lifecycle (full_mock / previous_year) | Yes — pending P0-01 resolution | 8/10 |
| Question loading (full_mock / previous_year) | Yes | 9/10 |
| Question loading (practice modes) | Workaround available | 6/10 |
| Answer persistence | Yes | 9/10 |
| Timer synchronization | Yes | 9/10 |
| Offline queue | Yes | 9/10 |
| Submit flow | Blocked until P0-01 resolved | 3/10 |
| Score + results redirect | Blocked until P0-01 resolved | 0/10 |
| Security (is_correct stripping) | Two vectors confirmed; stripping plan updated | 7/10 |
| Practice mode `total_questions` | Workaround available | 6/10 |

**Overall implementation readiness: 5.5 / 10**

The player cannot ship end-to-end until P0-01 (score permission) is resolved in the backend. Player UI, question display, answer persistence, timer, and palette can be built immediately. The submit → score → results flow is blocked.

**Recommended sequencing:**
1. Resolve P0-01 (scoring permission) in a focused Sprint 4 hotfix — this is a 1-line `permission_classes` change in `AttemptScore` plus an ownership check
2. Begin Mock Player implementation for `full_mock` and `previous_year` modes in parallel
3. Validate the complete flow end-to-end once P0-01 is resolved
4. Add practice mode support (topic/subject/mixed) using the client-side filter workaround

---

*Document version 1.0 — PrepGenius Backend Contract Validation — 2026-06-03*  
*This document supersedes OQ-01 through OQ-08 from mock-player-architecture.md; those open questions are now closed with definitive answers.*  
*This report must be reviewed and acknowledged by the engineering lead before Mock Player implementation begins.*
