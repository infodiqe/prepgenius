'use client';

/**
 * Mock Player — useIndexedDB hook
 *
 * React wrapper around the IndexedDB helper layer. Provides:
 *   - Graceful fallback when IndexedDB is unavailable (Safari private mode,
 *     Firefox private browsing with storage quota = 0, security restrictions).
 *   - Stale-session pruning on mount (removes sessions older than 48 hours).
 *   - Stable function references (useCallback) so consumers don't loop.
 *
 * ─── Failure Handling Strategy ───────────────────────────────────────────────
 *
 *   openPlayerDB() is called in a useEffect on mount. If it rejects:
 *     1. isAvailable is set to false.
 *     2. All returned functions become no-ops:
 *          reads return undefined / []
 *          writes return void (silently swallowed)
 *     3. The shell reads isAvailable and shows a persistent warning:
 *          "Answers cannot be saved locally — stay online to protect progress."
 *     4. The session still functions — answers are saved to the server normally.
 *        Only the IndexedDB persistence layer is absent; in-memory React state
 *        is the sole local buffer. If the page is refreshed, state is lost.
 *
 *   This means:
 *     - No crash in Safari private mode.
 *     - No crash on storage quota exceeded.
 *     - The module-level _dbPromise singleton in lib/indexedDB.ts will cache
 *       the rejected promise, so subsequent calls fail fast without re-opening.
 *
 * ─── Availability Timing ─────────────────────────────────────────────────────
 *
 *   isAvailable starts as false (initial render). The useEffect runs after
 *   paint, opens the DB, then sets isAvailable = true on success.
 *
 *   Consumers that need IDB data on mount should guard with isAvailable:
 *
 *     useEffect(() => {
 *       if (!idb.isAvailable) return;
 *       idb.readSession(attemptId).then(...);
 *     }, [idb.isAvailable, idb.readSession, attemptId]);
 *
 *   This is the correct pattern used by MockPlayerShell (Phase 3).
 */

import { useState, useEffect, useCallback } from 'react';

import * as idb from '../lib/indexedDB';
import type { PlayerSessionRecord, AnswerQueueRecord } from '../lib/indexedDB';
import type { LocalAnswer } from '../types';

const STALE_SESSION_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

// ─── Result type ──────────────────────────────────────────────────────────────

export interface UseIndexedDBResult {
  /** True once the DB has opened successfully. False if unavailable or not yet open. */
  isAvailable: boolean;
  readSession: (attemptId: string) => Promise<PlayerSessionRecord | undefined>;
  writeSession: (session: PlayerSessionRecord) => Promise<void>;
  readAnswers: (attemptId: string) => Promise<LocalAnswer[]>;
  upsertAnswer: (attemptId: string, answer: LocalAnswer) => Promise<void>;
  deleteSession: (attemptId: string) => Promise<void>;
  deleteAnswers: (attemptId: string) => Promise<void>;
  enqueueAnswer: (entry: Omit<AnswerQueueRecord, 'id'>) => Promise<void>;
  dequeueAnswer: (id: number) => Promise<void>;
  readQueue: (attemptId: string) => Promise<AnswerQueueRecord[]>;
  clearQueue: (attemptId: string) => Promise<void>;
  cleanupAttemptData: (attemptId: string) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIndexedDB(): UseIndexedDBResult {
  const [isAvailable, setIsAvailable] = useState(false);

  // Open DB on mount; prune stale sessions as a side-effect.
  useEffect(() => {
    idb
      .openPlayerDB()
      .then(() => {
        setIsAvailable(true);
        // Fire-and-forget: pruning errors don't affect availability
        return idb.pruneStaleSessionsOlderThan(STALE_SESSION_AGE_MS);
      })
      .catch(() => {
        // IDB unavailable (private browsing, quota, security policy).
        // isAvailable stays false; all functions below become no-ops.
        setIsAvailable(false);
      });
  }, []);

  // ── Wrapped helpers: no-op when unavailable; errors swallowed ───────────────
  //
  // Each function is individually wrapped rather than using a generic `safe(fn)`
  // helper to preserve correct return types without casting.
  //
  // useCallback deps include [isAvailable] so functions are recreated when the
  // DB transitions from unavailable → available (happens once on mount).

  const readSession = useCallback(
    async (attemptId: string): Promise<PlayerSessionRecord | undefined> => {
      if (!isAvailable) return undefined;
      try {
        return await idb.readSession(attemptId);
      } catch {
        return undefined;
      }
    },
    [isAvailable],
  );

  const writeSession = useCallback(
    async (session: PlayerSessionRecord): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.writeSession(session);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  const readAnswers = useCallback(
    async (attemptId: string): Promise<LocalAnswer[]> => {
      if (!isAvailable) return [];
      try {
        return await idb.readAnswers(attemptId);
      } catch {
        return [];
      }
    },
    [isAvailable],
  );

  const upsertAnswer = useCallback(
    async (attemptId: string, answer: LocalAnswer): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.upsertAnswer(attemptId, answer);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  const deleteSession = useCallback(
    async (attemptId: string): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.deleteSession(attemptId);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  const deleteAnswers = useCallback(
    async (attemptId: string): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.deleteAnswers(attemptId);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  const enqueueAnswer = useCallback(
    async (entry: Omit<AnswerQueueRecord, 'id'>): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.enqueueAnswer(entry);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  const dequeueAnswer = useCallback(
    async (id: number): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.dequeueAnswer(id);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  const readQueue = useCallback(
    async (attemptId: string): Promise<AnswerQueueRecord[]> => {
      if (!isAvailable) return [];
      try {
        return await idb.readQueue(attemptId);
      } catch {
        return [];
      }
    },
    [isAvailable],
  );

  const clearQueue = useCallback(
    async (attemptId: string): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.clearQueue(attemptId);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  const cleanupAttemptData = useCallback(
    async (attemptId: string): Promise<void> => {
      if (!isAvailable) return;
      try {
        await idb.cleanupAttemptData(attemptId);
      } catch {
        // no-op
      }
    },
    [isAvailable],
  );

  return {
    isAvailable,
    readSession,
    writeSession,
    readAnswers,
    upsertAnswer,
    deleteSession,
    deleteAnswers,
    enqueueAnswer,
    dequeueAnswer,
    readQueue,
    clearQueue,
    cleanupAttemptData,
  };
}
