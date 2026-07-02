'use client';

/**
 * Mock Player — useSaveAnswer hook
 *
 * Handles the full lifecycle of persisting a single answer interaction.
 *
 * ─── Answer Lifecycle ────────────────────────────────────────────────────────
 *
 *   1. Caller dispatches SELECT_OPTION / TOGGLE_MARK / CLEAR_RESPONSE
 *      → React state updated optimistically (tile color changes instantly)
 *
 *   2. Caller calls saveAnswer(questionId, selectedOptionId, state, timeSpentSeconds)
 *
 *   3. IndexedDB write-through (always, even before network):
 *        upsertAnswer(attemptId, { ...answer, dirty: true })
 *      This ensures data survives a crash before the network call returns.
 *
 *   4a. OFFLINE path (navigator.onLine === false):
 *        enqueueAnswer → answer_queue store
 *        dispatch QUEUE_OFFLINE → saveStatus = 'queued', offlineQueueSize++
 *        Return. useOfflineQueue flushes when reconnected.
 *
 *   4b. ONLINE path:
 *        dispatch SET_SAVE_STATUS('saving')
 *        POST /answers/save/ (with exponential backoff retries)
 *
 *        On 200:
 *          dispatch ACK_SAVE → dirty = false in reducer
 *          upsertAnswer(dirty: false) → IDB updated
 *          dispatch SET_SAVE_STATUS('saved')
 *          After 3s: dispatch SET_SAVE_STATUS('idle')
 *
 *        On AttemptNotActiveError (HTTP 400 — attempt auto-submitted):
 *          dispatch SET_SAVE_STATUS('failed')
 *          Stop. Shell detects this and redirects on next render.
 *
 *        On network error (goes offline during retry):
 *          enqueueAnswer → answer_queue store
 *          dispatch QUEUE_OFFLINE
 *          Return.
 *
 *        On all retries exhausted (server errors):
 *          enqueueAnswer → answer_queue store
 *          dispatch SET_SAVE_STATUS('failed')
 *
 * ─── Retry Strategy (architecture §5.3) ─────────────────────────────────────
 *
 *   Attempt 1: immediate
 *   Attempt 2: 1 s delay
 *   Attempt 3: 3 s delay
 *   Attempt 4: 10 s delay
 *   After 4 attempts: 'failed', answer buffered to answer_queue
 *
 *   navigator.onLine = false → skip retries immediately → 'queued'
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePlayerState } from './usePlayerState';
import { useIndexedDB } from './useIndexedDB';
import {
  savePlayerAnswer,
  AttemptNotActiveError,
  AttemptNotFoundError,
} from '../services/answerService';
import { activeFlushPromises, activeFlushingQuestions } from './useOfflineQueue';
import type { QuestionState } from '../types';
import type { LocalAnswer } from '../types';

// ─── Retry config ─────────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [1000, 3000, 10000] as const; // 3 delays → 4 total attempts
const SAVED_IDLE_DELAY_MS = 3000;

// Module-level map to track the latest request sequence number per questionId.
// Ensures that only the latest initiated save request for a given question can mutate state or clear dirty flags.
const latestRequestSequence = new Map<string, number>();

// ─── Private helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseSaveAnswerResult {
  /**
   * Persists an answer interaction: IndexedDB write-through → network save.
   * Fire-and-forget is acceptable; errors are handled internally with retries
   * and state transitions. Callers do NOT need to await this.
   */
  saveAnswer: (
    questionId: string,
    selectedOptionId: string | null,
    state: QuestionState,
    timeSpentSeconds: number,
  ) => Promise<void>;
}

export function useSaveAnswer(): UseSaveAnswerResult {
  const { state: playerState, dispatch } = usePlayerState();
  const idb = useIndexedDB();

  // Ref keeps the latest attemptId without making it a dep of saveAnswer.
  // This avoids recreating saveAnswer on every state change.
  const attemptIdRef = useRef(playerState.attemptId);
  attemptIdRef.current = playerState.attemptId;

  // Ref to track the active idle status fade timer
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Unmount cleanup for the idle timer
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const saveAnswer = useCallback(
    async (
      questionId: string,
      selectedOptionId: string | null,
      state: QuestionState,
      timeSpentSeconds: number,
    ): Promise<void> => {
      const attemptId = attemptIdRef.current;

      // ── Guard: no attempt id → nothing to save ─────────────────────────────
      // saveAnswer can be invoked before LOAD_SESSION has re-rendered (e.g. the
      // shell's initial "mark Q1 visited" call fires synchronously right after
      // dispatching LOAD_SESSION, while attemptIdRef still holds the initial '').
      // Without this guard the request goes to /attempts/attempts//answers/save/
      // (empty id) → 404 → 4 pointless retries. The question is still marked
      // visited in React state; a real save follows once the session is loaded.
      if (!attemptId) return;

      // ── Step 0: Deterministic sequencing ───────────────────────────────────
      const currentSequence = (latestRequestSequence.get(questionId) ?? 0) + 1;
      latestRequestSequence.set(questionId, currentSequence);

      const localAnswer: LocalAnswer = {
        questionId,
        selectedOptionId,
        state,
        timeSpentSeconds,
        dirty: true,
        lastModifiedAt: Date.now(),
      };

      // ── Step 1: IndexedDB write-through (crash-safe) ──────────────────────
      // This always runs, online or offline. If IDB is unavailable (private
      // browsing), upsertAnswer is a no-op — the answer survives in React state
      // only and the student sees a warning from the shell.
      await idb.upsertAnswer(attemptId, localAnswer);

      // ── Step 1.5: Active Flush Serialization ──────────────────────────────
      // If this question is currently in the active flush batch, wait for the flush
      // to finish before executing any online/offline routing or network dispatch.
      const flushingQuestions = activeFlushingQuestions.get(attemptId);
      if (flushingQuestions?.has(questionId)) {
        const flushPromise = activeFlushPromises.get(attemptId);
        if (flushPromise) {
          try {
            await flushPromise;
          } catch {
            // Ignore flush errors; we want to attempt our new save anyway
          }
        }
      }

      // ── Step 2: Offline fast-path ─────────────────────────────────────────
      if (!navigator.onLine) {
        await idb.enqueueAnswer({
          attemptId,
          questionId,
          selectedOptionId,
          state,
          timeSpentSeconds,
          queuedAt: Date.now(),
          retryCount: 0,
        });
        
        // Only update UI state if this request is still the latest one
        if (latestRequestSequence.get(questionId) === currentSequence) {
          dispatch({ type: 'QUEUE_OFFLINE' });
        }
        return;
      }

      // ── Step 3: Online — attempt save with exponential backoff ────────────
      if (latestRequestSequence.get(questionId) === currentSequence) {
        dispatch({ type: 'SET_SAVE_STATUS', payload: { status: 'saving' } });
      }

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        // Apply delay before retry attempts (not before the first attempt)
        if (attempt > 0) {
          await sleep(RETRY_DELAYS_MS[attempt - 1]);
        }

        // Re-check: may have gone offline while waiting for a retry delay
        if (!navigator.onLine) {
          await idb.enqueueAnswer({
            attemptId,
            questionId,
            selectedOptionId,
            state,
            timeSpentSeconds,
            queuedAt: Date.now(),
            retryCount: attempt,
          });
          
          if (latestRequestSequence.get(questionId) === currentSequence) {
            dispatch({ type: 'QUEUE_OFFLINE' });
          }
          return;
        }

        try {
          await savePlayerAnswer(attemptId, {
            questionId,
            selectedOptionId,
            state,
            timeSpentSeconds,
          });

          // ── Success ───────────────────────────────────────────────────────
          // ONLY prevent stale requests from mutating state, IndexedDB, or UI.
          if (latestRequestSequence.get(questionId) === currentSequence) {
            dispatch({ type: 'ACK_SAVE', payload: { questionId } });

            // Update IDB: mark as no longer dirty
            await idb.upsertAnswer(attemptId, { ...localAnswer, dirty: false });

            dispatch({ type: 'SET_SAVE_STATUS', payload: { status: 'saved' } });

            // Clear previous idle timer if active
            if (idleTimerRef.current) {
              clearTimeout(idleTimerRef.current);
            }

            // Fade to idle after 3 s
            idleTimerRef.current = setTimeout(() => {
              if (latestRequestSequence.get(questionId) === currentSequence) {
                dispatch({ type: 'SET_SAVE_STATUS', payload: { status: 'idle' } });
              }
              idleTimerRef.current = null;
            }, SAVED_IDLE_DELAY_MS);
          }

          return;
        } catch (err) {
          if (err instanceof AttemptNotActiveError) {
            // Attempt auto-submitted by server. Stop all saves; shell will redirect.
            if (latestRequestSequence.get(questionId) === currentSequence) {
              dispatch({
                type: 'SET_SAVE_STATUS',
                payload: { status: 'failed' },
              });
            }
            return;
          }

          if (err instanceof AttemptNotFoundError) {
            // 404 = invalid attempt/question id. Retrying can never succeed, so
            // stop immediately instead of burning the 4-attempt backoff.
            if (latestRequestSequence.get(questionId) === currentSequence) {
              dispatch({
                type: 'SET_SAVE_STATUS',
                payload: { status: 'failed' },
              });
            }
            return;
          }

          // Last attempt exhausted → buffer to queue
          if (attempt === RETRY_DELAYS_MS.length) {
            await idb.enqueueAnswer({
              attemptId,
              questionId,
              selectedOptionId,
              state,
              timeSpentSeconds,
              queuedAt: Date.now(),
              retryCount: attempt,
            });
            
            if (latestRequestSequence.get(questionId) === currentSequence) {
              dispatch({
                type: 'SET_SAVE_STATUS',
                payload: { status: 'failed' },
              });
            }
            return;
          }
          // else: loop continues with next retry attempt
        }
      }
    },
    // dispatch and idb are stable after IDB opens; attemptIdRef is a ref object.
    [dispatch, idb],
  );

  return { saveAnswer };
}
