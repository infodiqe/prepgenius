'use client';

/**
 * Mock Player — useOfflineQueue hook
 *
 * Manages the offline answer queue: buffers saves when the network is down
 * and flushes them in FIFO batches when connectivity returns.
 *
 * ─── Offline Recovery Sequence ───────────────────────────────────────────────
 *
 *   [Network drops]
 *       │
 *       ▼
 *   useSaveAnswer writes to answer_queue IDB store
 *   dispatch QUEUE_OFFLINE → saveStatus='queued', offlineQueueSize++
 *       │
 *   [Network returns]
 *       │
 *       ▼
 *   window 'online' event fires
 *       │
 *       ▼
 *   readQueue(attemptId) → entries sorted by queuedAt ASC (FIFO)
 *       │
 *       ▼  for each batch of BATCH_SIZE entries:
 *   POST /answers/bulk-save/ (batch)
 *       │
 *       ├── 200 OK:
 *       │     dequeueAnswer(id) for each entry in batch
 *       │     dispatch SET_QUEUE_SIZE(remaining)
 *       │     continue to next batch
 *       │
 *       ├── AttemptNotActiveError (HTTP 400):
 *       │     Attempt was auto-submitted while offline.
 *       │     clearQueue(attemptId)
 *       │     dispatch SET_QUEUE_SIZE(0)
 *       │     onAttemptAutoSubmitted?.() → shell redirects to results
 *       │     STOP flush
 *       │
 *       └── Network error / other:
 *             Leave remaining entries in queue.
 *             Flush will retry on next 'online' event.
 *             STOP flush
 *       │
 *       ▼  (all batches succeeded)
 *   dispatch SET_QUEUE_SIZE(0)
 *   dispatch SET_SAVE_STATUS('saved')
 *   dispatch FLUSH_QUEUE
 *
 * ─── Pre-Submit Flush ────────────────────────────────────────────────────────
 *
 *   flushNow() is exposed for the SubmitDialog to call before POST /submit/.
 *   The shell awaits it with a 10-second timeout (architecture §7.5).
 *   If the flush doesn't complete within the timeout, submit proceeds anyway —
 *   the server has whatever answers were saved before the network dropped.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePlayerState } from './usePlayerState';
import { useIndexedDB } from './useIndexedDB';
import {
  bulkSavePlayerAnswers,
  AttemptNotActiveError,
} from '../services/answerService';
import type { SaveAnswerPayload } from '../services/answerService';
import type { AnswerQueueRecord } from '../lib/indexedDB';

const BATCH_SIZE = 10;

// Module-level state to share active flush tracking with useSaveAnswer.ts
// Maps attemptId to the active flush promise.
export const activeFlushPromises = new Map<string, Promise<boolean>>();

// Maps attemptId to the set of questionIds currently in the active flush batch.
export const activeFlushingQuestions = new Map<string, Set<string>>();

export interface UseOfflineQueueResult {
  /**
   * Flush all queued offline answers immediately.
   * Used by the submit flow before calling POST /submit/.
   *
   * Returns TRUE when the queue is fully drained and it is safe to submit:
   *   - queue was already empty, OR
   *   - all batches POSTed successfully, OR
   *   - AttemptNotActiveError (attempt already submitted; answers are moot —
   *     the redirect callback fires, so the caller will navigate away).
   *
   * Returns FALSE when entries remain queued (network failure mid-flush).
   * The caller MUST NOT submit in that case (queue-safety guarantee §7).
   */
  flushNow: () => Promise<boolean>;
}

export function useOfflineQueue(
  onAttemptAutoSubmitted?: () => void,
): UseOfflineQueueResult {
  const { state: playerState, dispatch } = usePlayerState();
  const idb = useIndexedDB();

  // Stable ref: avoids making flush depend on playerState (which changes often)
  const attemptIdRef = useRef(playerState.attemptId);
  attemptIdRef.current = playerState.attemptId;

  // Stable ref for the callback
  const onAutoSubmittedRef = useRef(onAttemptAutoSubmitted);
  onAutoSubmittedRef.current = onAttemptAutoSubmitted;

  // Ref to track and share the active flush promise across concurrent invokers
  const activeFlushPromiseRef = useRef<Promise<boolean> | null>(null);

  const flush = useCallback(async (): Promise<boolean> => {
    // If a flush is already active, return its promise to prevent concurrency
    if (activeFlushPromiseRef.current) {
      return activeFlushPromiseRef.current;
    }

    const attemptId = attemptIdRef.current;
    if (!attemptId) return true; // nothing to flush → safe

    const runFlush = async (): Promise<boolean> => {
      const queue: AnswerQueueRecord[] = await idb.readQueue(attemptId);
      if (queue.length === 0) return true; // already drained → safe

      // Record all question IDs in the active flush
      const questionIds = new Set(queue.map(entry => entry.questionId));
      activeFlushingQuestions.set(attemptId, questionIds);

      let processedCount = 0;

      try {
        for (let batchStart = 0; batchStart < queue.length; batchStart += BATCH_SIZE) {
          const batch = queue.slice(batchStart, batchStart + BATCH_SIZE);

          const payloads: SaveAnswerPayload[] = batch.map((entry) => ({
            questionId: entry.questionId,
            selectedOptionId: entry.selectedOptionId,
            state: entry.state,
            timeSpentSeconds: entry.timeSpentSeconds,
          }));

          try {
            await bulkSavePlayerAnswers(attemptId, payloads);

            // Dequeue each successfully saved entry
            for (const entry of batch) {
              if (entry.id !== undefined) {
                await idb.dequeueAnswer(entry.id);
              }
            }

            processedCount += batch.length;
            const remaining = queue.length - processedCount;
            dispatch({ type: 'SET_QUEUE_SIZE', payload: { size: Math.max(0, remaining) } });
          } catch (err) {
            if (err instanceof AttemptNotActiveError) {
              // Attempt was auto-submitted by the server's Celery task while we
              // were offline. All queued answers are now irrelevant; clear them.
              await idb.clearQueue(attemptId);
              dispatch({ type: 'SET_QUEUE_SIZE', payload: { size: 0 } });
              dispatch({ type: 'FLUSH_QUEUE' });
              onAutoSubmittedRef.current?.();
              // Attempt already finalised server-side; redirect handles navigation.
              return true;
            }
            // Network error or transient failure: stop the flush; remaining entries
            // stay in the queue for the next reconnect event. NOT safe to submit.
            return false;
          }
        }

        // All batches processed successfully
        dispatch({ type: 'SET_QUEUE_SIZE', payload: { size: 0 } });
        dispatch({ type: 'SET_SAVE_STATUS', payload: { status: 'saved' } });
        dispatch({ type: 'FLUSH_QUEUE' });
        return true;
      } finally {
        activeFlushingQuestions.delete(attemptId);
      }
    };

    const promise = runFlush();
    activeFlushPromiseRef.current = promise;
    activeFlushPromises.set(attemptId, promise);

    try {
      return await promise;
    } finally {
      activeFlushPromiseRef.current = null;
      activeFlushPromises.delete(attemptId);
    }
  }, [dispatch, idb]);

  // ── Auto-flush on reconnect ─────────────────────────────────────────────────
  useEffect(() => {
    function handleOnline() {
      void flush();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flush]);

  // ── Flush on mount if queue is non-empty and online ─────────────────────────
  // Handles the case where the user was offline, closed the tab, and returns.
  useEffect(() => {
    if (navigator.onLine && playerState.offlineQueueSize > 0) {
      void flush();
    }
    // Only run on mount — playerState.offlineQueueSize is the IDB-restored count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { flushNow: flush };
}
