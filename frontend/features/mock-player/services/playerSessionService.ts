/**
 * Mock Player — Player Session Service
 *
 * RESPONSIBILITIES:
 *   1. Load an existing attempt (metadata + existing answers) from the server
 *   2. Start a 'created' attempt (transition → in_progress)
 *   3. Submit an in_progress attempt (transition → submitted/scored)
 *
 * ANTI-CHEAT ENFORCEMENT (architecture §18.2):
 *   ScoredAttemptDetail includes answers[].is_correct and top-level scoring
 *   fields (score, correct, incorrect, skipped, accuracy). These are valid
 *   after scoring but MUST NOT be surfaced to the player during an active
 *   attempt. This service:
 *     - Returns AttemptMetadata which explicitly OMITS scoring fields
 *     - Returns StrippedUserAnswer[] (is_correct removed from each answer)
 *     - Returns SubmitResult which exposes ONLY status + submitted_at
 *
 * Backend → PlayerState field mapping:
 *
 *   ScoredAttemptDetail (GET /attempts/attempts/{id}/) → PlayerLoadData
 *     id                  → AttemptMetadata.attemptId
 *     exam_id             → AttemptMetadata.examId
 *     mock_test_id        → AttemptMetadata.mockTestId
 *     attempt_type        → AttemptMetadata.attemptType
 *     status              → AttemptMetadata.attemptStatus
 *     started_at          → AttemptMetadata.startedAt   (null if 'created')
 *     duration_seconds    → AttemptMetadata.durationSeconds
 *     total_questions     → AttemptMetadata.totalQuestions
 *     answers[]           → PlayerLoadData.existingAnswers (stripped)
 *     score               → DROPPED (anti-cheat: null during in_progress)
 *     max_score           → DROPPED
 *     correct             → DROPPED
 *     incorrect           → DROPPED
 *     skipped             → DROPPED
 *     accuracy            → DROPPED
 *     time_taken_seconds  → DROPPED
 *     user_id             → DROPPED (not needed in player)
 *     submitted_at        → DROPPED (not needed until redirect)
 *     institution_id      → DROPPED
 *     batch_id            → DROPPED (ExamAttemptRead only)
 *     created_at          → DROPPED
 *     updated_at          → DROPPED
 *
 *   ExamAttemptRead (POST /start/, POST /submit/) → AttemptMetadata / SubmitResult
 *     id                  → AttemptMetadata.attemptId  (start response)
 *     started_at          → AttemptMetadata.startedAt  (set by server on start)
 *     duration_seconds    → AttemptMetadata.durationSeconds  (set by server on start)
 *     status              → SubmitResult.status  (submit response)
 *     submitted_at        → SubmitResult.submittedAt  (submit response)
 *     score/correct/etc.  → DROPPED (anti-cheat)
 *
 * Assumptions:
 *   - answers[] in GET /attempts/{id}/ is populated during in_progress
 *     (OQ-02 resolved per implementation plan). No separate GET /answers/ call needed.
 *   - POST /submit/ returns status='scored' after the hotfix
 *     (99.9% case). The caller handles status='submitted' with polling.
 *   - started_at and duration_seconds may be null for a 'created' attempt;
 *     they are always non-null after POST /start/ succeeds.
 */

import { apiRequest } from '@/lib/api/client';
import type { components } from '@/lib/api/types';
import type { AttemptType, AttemptStatus } from '../types';
import type { StrippedUserAnswer } from './answerService';

// ─── Backend raw types ────────────────────────────────────────────────────────

type RawScoredAttemptDetail = components['schemas']['ScoredAttemptDetail'];
type RawExamAttemptRead = components['schemas']['ExamAttemptRead'];
type RawUserAnswerRead = components['schemas']['UserAnswerRead'];

// ─── Exported DTO types ───────────────────────────────────────────────────────

/**
 * Attempt fields the player needs for session hydration.
 *
 * ANTI-CHEAT: Scoring fields (score, correct, incorrect, skipped, accuracy,
 * time_taken_seconds) are deliberately absent. These fields are null during
 * in_progress anyway, but the type makes leakage structurally impossible.
 */
export interface AttemptMetadata {
  attemptId: string;
  examId: string;
  mockTestId: string | null;
  attemptType: AttemptType;
  attemptStatus: AttemptStatus;
  startedAt: string | null;      // null for 'created'; always set after start
  durationSeconds: number | null; // null for 'created'; always set after start
  totalQuestions: number;
}

/**
 * Full load payload returned by loadAttempt.
 * Contains metadata + server-acknowledged answers (with is_correct stripped).
 */
export interface PlayerLoadData {
  attempt: AttemptMetadata;
  existingAnswers: StrippedUserAnswer[];
}

/**
 * What the player needs after submitting.
 *
 * ANTI-CHEAT: Only status and submitted_at are exposed. Score, correct,
 * incorrect, accuracy are available in the raw response but not surfaced
 * here — the Results page fetches them independently after redirect.
 */
export interface SubmitResult {
  status: AttemptStatus;
  submittedAt: string | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Strips is_correct from a raw UserAnswerRead.
 * Mirrors the same stripping done in answerService.ts for symmetry.
 * Defined locally to avoid a circular dependency between services.
 */
function stripAnswerIsCorrect(raw: RawUserAnswerRead): StrippedUserAnswer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { is_correct: _isCorrect, ...safe } = raw;
  return safe;
}

/**
 * Maps common fields from either ScoredAttemptDetail or ExamAttemptRead
 * to AttemptMetadata. Both types share the same set of metadata fields;
 * their types are structurally identical for those fields.
 *
 * ANTI-CHEAT: Only metadata fields are mapped. Scoring fields present on
 * both raw types are intentionally excluded from the return value.
 */
function toAttemptMetadata(
  raw: RawScoredAttemptDetail | RawExamAttemptRead,
): AttemptMetadata {
  return {
    attemptId: raw.id,
    examId: raw.exam_id,
    mockTestId: raw.mock_test_id,
    attemptType: raw.attempt_type,   // same string literals as AttemptType
    attemptStatus: raw.status,        // same string literals as AttemptStatus
    startedAt: raw.started_at ?? null,
    durationSeconds: raw.duration_seconds ?? null,
    totalQuestions: raw.total_questions,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads an attempt's metadata and existing server-acknowledged answers.
 *
 * Called by:
 *   - page.tsx RSC (initial server-side load)
 *   - MockPlayerShell on resume (client-side re-fetch with refetchOnMount)
 *
 * Per the implementation plan (OQ-02 resolved): answers[] in ScoredAttemptDetail
 * is populated during in_progress, so no separate GET /answers/ call is needed.
 *
 * @throws Error on network failure or non-200 response.
 */
export async function loadAttempt(attemptId: string): Promise<PlayerLoadData> {
  const raw = await apiRequest<RawScoredAttemptDetail>(
    `/attempts/attempts/${attemptId}/`,
  );

  return {
    attempt: toAttemptMetadata(raw),
    existingAnswers: raw.answers.map(stripAnswerIsCorrect),
  };
}

/**
 * Transitions a 'created' attempt to 'in_progress'.
 * The server sets started_at and duration_seconds at this point.
 *
 * Called by MockPlayerShell on mount when attemptStatus === 'created'.
 * The returned AttemptMetadata replaces the initial metadata from loadAttempt
 * so the timer has a valid startedAt anchor.
 *
 * @throws Error on HTTP 400 (invalid transition or mock test not published),
 *              on HTTP 404 (attempt not found), or network failure.
 */
export async function startAttempt(
  attemptId: string,
): Promise<AttemptMetadata> {
  const raw = await apiRequest<RawExamAttemptRead>(
    `/attempts/attempts/${attemptId}/start/`,
    { method: 'POST' },
  );
  return toAttemptMetadata(raw);
}

/**
 * Submits the attempt (transitions in_progress → submitted/scored).
 *
 * With the backend hotfix, POST /submit/ chains immediately into scoring and
 * returns status='scored' in the normal case. The player caller handles the
 * edge case where status='submitted' (auto-score chaining failed) by polling.
 *
 * Returns ONLY status and submitted_at. Scoring fields in the raw response
 * (score, correct, incorrect, accuracy) are intentionally excluded — the
 * Results page fetches them independently after redirect.
 *
 * @throws Error on HTTP 400 (invalid transition), HTTP 404, or network failure.
 */
export async function submitAttempt(
  attemptId: string,
): Promise<SubmitResult> {
  const raw = await apiRequest<RawExamAttemptRead>(
    `/attempts/attempts/${attemptId}/submit/`,
    { method: 'POST' },
  );

  return {
    status: raw.status,
    submittedAt: raw.submitted_at ?? null,
  };
}
