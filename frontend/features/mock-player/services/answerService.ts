/**
 * Mock Player — Answer Service
 *
 * RESPONSIBILITIES:
 *   1. Save a single answer for a question in an active attempt (idempotent)
 *   2. Bulk-save multiple answers (used for offline queue flush / pre-submit flush)
 *   3. Normalize backend responses — stripping the anti-cheat field
 *
 * ANTI-CHEAT ENFORCEMENT (architecture §18.2):
 *   The backend UserAnswerRead response includes `is_correct: boolean | null`.
 *   During an active attempt this field MUST NEVER reach React state, context,
 *   IndexedDB, or any consumer of this service.
 *
 *   Stripping is implemented via destructuring assignment. The exported
 *   StrippedUserAnswer type (Omit<UserAnswerRead, 'is_correct'>) ensures the
 *   field is absent at the type level — any accidental use is a compile error.
 *
 * Backend → DTO mapping (UserAnswerRead → StrippedUserAnswer):
 *   id                → StrippedUserAnswer.id
 *   attempt_id        → StrippedUserAnswer.attempt_id
 *   question_id       → StrippedUserAnswer.question_id
 *   selected_option_id → StrippedUserAnswer.selected_option_id
 *   state             → StrippedUserAnswer.state
 *   is_correct        → STRIPPED (anti-cheat boundary)
 *   time_spent_seconds → StrippedUserAnswer.time_spent_seconds
 *   answered_at       → StrippedUserAnswer.answered_at
 *   created_at        → StrippedUserAnswer.created_at
 *
 * Request payload mapping (SaveAnswerPayload → UserAnswerSaveRequest):
 *   questionId        → question_id
 *   selectedOptionId  → selected_option_id  (null = clear response)
 *   state             → state
 *   timeSpentSeconds  → time_spent_seconds
 *
 * Assumptions:
 *   - HTTP 400 from /answers/save/ always means the attempt is not in_progress
 *     (the backend error description confirms: "Validation error or attempt not
 *     in progress"). There is no finer-grained 400 sub-code in the frozen API.
 *   - HTTP 400 from /answers/bulk-save/ has the same semantics and stops the
 *     entire flush (the server rejected all answers in the batch).
 *   - The bulk-save endpoint is all-or-nothing; there is no partial-success
 *     response from the backend. The BulkSaveResult.failed[] array is always
 *     empty on success and the caller receives AttemptNotActiveError on 400.
 */

import type { components } from '@/lib/api/types';
import type { QuestionState } from '../types';

// ─── Backend raw types ────────────────────────────────────────────────────────

type RawUserAnswerRead = components['schemas']['UserAnswerRead'];
type RawSaveStateEnum = components['schemas']['UserAnswerSaveStateEnum'];

// ─── Exported DTO type ────────────────────────────────────────────────────────

/**
 * UserAnswerRead with is_correct removed.
 * This is the ONLY answer type returned by this service. Consumers never
 * receive or store is_correct during an active attempt.
 */
export type StrippedUserAnswer = Omit<RawUserAnswerRead, 'is_correct'>;

// ─── Custom errors ────────────────────────────────────────────────────────────

/**
 * Thrown when the server returns HTTP 400 on an answer save.
 * This means the attempt is no longer in_progress (auto-submitted, or already
 * scored). The caller should stop all pending saves and redirect to results.
 */
export class AttemptNotActiveError extends Error {
  constructor() {
    super("Attempt is not in the 'in_progress' state");
    this.name = 'AttemptNotActiveError';
  }
}

/**
 * Thrown when the server returns HTTP 404 on an answer save.
 * This means the attempt UUID or question UUID is invalid.
 */
export class AttemptNotFoundError extends Error {
  constructor() {
    super('Attempt or question not found');
    this.name = 'AttemptNotFoundError';
  }
}

// ─── Request / Response types ─────────────────────────────────────────────────

/** Payload for saving a single answer. CamelCase counterpart of UserAnswerSaveRequest. */
export interface SaveAnswerPayload {
  questionId: string;
  selectedOptionId: string | null; // null = clear response
  state: QuestionState;
  timeSpentSeconds: number;
}

/** Return type of bulkSavePlayerAnswers. */
export interface BulkSaveResult {
  succeeded: StrippedUserAnswer[];
  failed: SaveAnswerPayload[]; // always empty on success (batch is all-or-nothing)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const PLAYER_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

/**
 * Status-code-aware POST helper for player answer endpoints.
 *
 * Unlike the shared apiRequest(), this inspects the status code before
 * throwing so callers can distinguish AttemptNotActiveError (400) from
 * AttemptNotFoundError (404) from transient failures (5xx / network).
 * The caller decides whether to retry or queue offline.
 */
async function playerPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${PLAYER_API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 400) throw new AttemptNotActiveError();
  if (response.status === 404) throw new AttemptNotFoundError();

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(
      (payload as { detail?: string }).detail ?? 'Player API request failed',
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Strips is_correct from a raw UserAnswerRead.
 *
 * ANTI-CHEAT: `_isCorrect` is intentionally discarded. The underscore prefix
 * signals to linters that the value is unused by design.
 */
function stripIsCorrect(raw: RawUserAnswerRead): StrippedUserAnswer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { is_correct: _isCorrect, ...safe } = raw;
  return safe;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves a single answer for a question in an active attempt.
 * Idempotent: repeated calls for the same attempt + question overwrite.
 *
 * @throws AttemptNotActiveError  on HTTP 400 (attempt not in_progress)
 * @throws AttemptNotFoundError   on HTTP 404 (invalid attempt or question ID)
 * @throws Error                  on network failure or unexpected status
 */
export async function savePlayerAnswer(
  attemptId: string,
  payload: SaveAnswerPayload,
): Promise<StrippedUserAnswer> {
  const raw = await playerPost<RawUserAnswerRead>(
    `/attempts/attempts/${attemptId}/answers/save/`,
    {
      question_id: payload.questionId,
      selected_option_id: payload.selectedOptionId,
      state: payload.state as RawSaveStateEnum,
      time_spent_seconds: payload.timeSpentSeconds,
    },
  );
  return stripIsCorrect(raw);
}

/**
 * Bulk-saves multiple answers in one request.
 * Used for offline queue flush and the pre-submit flush.
 *
 * The /bulk-save/ endpoint is all-or-nothing: either all answers are saved
 * (200) or the batch fails (400 = attempt not active, 404 = not found).
 *
 * On HTTP 400: throws AttemptNotActiveError — the caller must stop flushing
 * and check the attempt status. The attempt was likely auto-submitted by
 * the Celery task while the client was offline.
 *
 * @throws AttemptNotActiveError  on HTTP 400
 * @throws AttemptNotFoundError   on HTTP 404
 * @throws Error                  on network failure or unexpected status
 */
export async function bulkSavePlayerAnswers(
  attemptId: string,
  payloads: SaveAnswerPayload[],
): Promise<BulkSaveResult> {
  const raw = await playerPost<RawUserAnswerRead[]>(
    `/attempts/attempts/${attemptId}/answers/bulk-save/`,
    {
      answers: payloads.map((p) => ({
        question_id: p.questionId,
        selected_option_id: p.selectedOptionId,
        state: p.state as RawSaveStateEnum,
        time_spent_seconds: p.timeSpentSeconds,
      })),
    },
  );

  return {
    succeeded: raw.map(stripIsCorrect),
    failed: [], // all-or-nothing batch; if we reach here, all succeeded
  };
}
