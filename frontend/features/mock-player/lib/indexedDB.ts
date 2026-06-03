/**
 * Mock Player — IndexedDB layer.
 *
 * Database:  'prepgenius-player'  version 1
 * Stores:
 *   player_session  – one record per active attempt (session metadata)
 *   session_answers – one record per question in the active attempt
 *   answer_queue    – offline-queued saves not yet server-acknowledged
 *
 * ANTI-CHEAT INVARIANT (architecture §8.4):
 *   The following fields are NEVER written to any store:
 *     - is_correct (option or answer)
 *     - explanation
 *     - score, accuracy, correct, incorrect, skipped
 *   Stripping happens in the service layer before data reaches these helpers.
 *   The record types below structurally enforce this — those fields do not exist.
 */

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { LocalAnswer, QuestionState } from '../types';

// ─── Store Record Types ───────────────────────────────────────────────────────

/**
 * One record per active attempt. Persists navigation position across refreshes.
 * Stored in 'player_session', keyPath: 'attemptId'.
 *
 * ANTI-CHEAT: No correctness or scoring data. See architecture §8.3.
 */
export interface PlayerSessionRecord {
  attemptId: string;         // primary key
  examId: string;
  mockTestId: string | null;
  attemptType: string;
  currentIndex: number;      // last viewed question index; restored on refresh
  sessionOpenedAt: number;   // Unix ms; used by stale-session pruning
}

/**
 * One record per question per active attempt. Persists answer state.
 * Stored in 'session_answers', keyPath: ['attemptId', 'questionId'].
 *
 * ANTI-CHEAT: No is_correct, no explanation, no scoring data. See §8.4.
 */
export interface SessionAnswerRecord {
  attemptId: string;               // first component of compound key
  questionId: string;              // second component of compound key
  selectedOptionId: string | null;
  state: QuestionState;
  timeSpentSeconds: number;
  dirty: boolean;                  // true = not yet server-acknowledged
  lastModifiedAt: number;          // Unix ms
}

/**
 * One record per queued offline save. Flushed to server on reconnect.
 * Stored in 'answer_queue', keyPath: 'id' (autoIncrement).
 *
 * ANTI-CHEAT: No correctness data. Only operational save fields. See §7.2.
 */
export interface AnswerQueueRecord {
  id?: number;                     // autoIncrement PK; undefined before first write
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  state: QuestionState;
  timeSpentSeconds: number;
  queuedAt: number;                // Unix ms; FIFO sort key
  retryCount: number;              // starts at 0; incremented on each retry
}

// ─── DB Schema ────────────────────────────────────────────────────────────────

interface PlayerDBSchema extends DBSchema {
  player_session: {
    key: string;
    value: PlayerSessionRecord;
  };
  session_answers: {
    key: [string, string]; // [attemptId, questionId]
    value: SessionAnswerRecord;
  };
  answer_queue: {
    key: number;
    value: AnswerQueueRecord;
    indexes: {
      'by-attempt': string; // index on attemptId; enables efficient per-attempt queries
    };
  };
}

// ─── DB Singleton ─────────────────────────────────────────────────────────────

const DB_NAME = 'prepgenius-player';
const DB_VERSION = 1;

// Module-level promise so all callers share one connection.
let _dbPromise: Promise<IDBPDatabase<PlayerDBSchema>> | null = null;

export function openPlayerDB(): Promise<IDBPDatabase<PlayerDBSchema>> {
  if (_dbPromise === null) {
    _dbPromise = openDB<PlayerDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('player_session')) {
          db.createObjectStore('player_session', { keyPath: 'attemptId' });
        }

        if (!db.objectStoreNames.contains('session_answers')) {
          db.createObjectStore('session_answers', {
            keyPath: ['attemptId', 'questionId'],
          });
        }

        if (!db.objectStoreNames.contains('answer_queue')) {
          const queueStore = db.createObjectStore('answer_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          queueStore.createIndex('by-attempt', 'attemptId', { unique: false });
        }
      },
    });
  }
  return _dbPromise;
}

// ─── player_session helpers ───────────────────────────────────────────────────

export async function readSession(
  attemptId: string,
): Promise<PlayerSessionRecord | undefined> {
  const db = await openPlayerDB();
  return db.get('player_session', attemptId);
}

export async function writeSession(
  session: PlayerSessionRecord,
): Promise<void> {
  const db = await openPlayerDB();
  await db.put('player_session', session);
}

export async function deleteSession(attemptId: string): Promise<void> {
  const db = await openPlayerDB();
  await db.delete('player_session', attemptId);
}

// ─── session_answers helpers ──────────────────────────────────────────────────

/**
 * Returns all stored answers for an attempt, mapped to LocalAnswer shape.
 * Reads all records and filters client-side — acceptable for ≤150 questions per session.
 */
export async function readAnswers(attemptId: string): Promise<LocalAnswer[]> {
  const db = await openPlayerDB();
  const tx = db.transaction('session_answers', 'readonly');
  const all = await tx.objectStore('session_answers').getAll();
  await tx.done;

  return all
    .filter((r) => r.attemptId === attemptId)
    .map(
      (r): LocalAnswer => ({
        questionId: r.questionId,
        selectedOptionId: r.selectedOptionId,
        state: r.state,
        timeSpentSeconds: r.timeSpentSeconds,
        dirty: r.dirty,
        lastModifiedAt: r.lastModifiedAt,
      }),
    );
}

/**
 * Upserts a single answer record. Uses put() so repeated calls for the same
 * question overwrite safely (idempotent from the IndexedDB perspective).
 */
export async function upsertAnswer(
  attemptId: string,
  answer: LocalAnswer,
): Promise<void> {
  const db = await openPlayerDB();
  const record: SessionAnswerRecord = {
    attemptId,
    questionId: answer.questionId,
    selectedOptionId: answer.selectedOptionId,
    state: answer.state,
    timeSpentSeconds: answer.timeSpentSeconds,
    dirty: answer.dirty,
    lastModifiedAt: answer.lastModifiedAt,
  };
  await db.put('session_answers', record);
}

/**
 * Deletes all answer records for an attempt.
 * Called on successful submit + redirect (architecture §8.5).
 */
export async function deleteAnswers(attemptId: string): Promise<void> {
  const db = await openPlayerDB();
  const tx = db.transaction('session_answers', 'readwrite');
  const store = tx.objectStore('session_answers');
  const all = await store.getAll();

  for (const record of all) {
    if (record.attemptId === attemptId) {
      await store.delete([attemptId, record.questionId]);
    }
  }
  await tx.done;
}

// ─── answer_queue helpers ─────────────────────────────────────────────────────

/**
 * Appends an entry to the offline queue.
 * Called when a save is attempted while navigator.onLine === false.
 * The 'id' field is omitted because it is autoIncrement-assigned by IndexedDB.
 */
export async function enqueueAnswer(
  entry: Omit<AnswerQueueRecord, 'id'>,
): Promise<void> {
  const db = await openPlayerDB();
  // Cast is safe: idb autoIncrement stores accept the value without the key field.
  await db.add('answer_queue', entry as AnswerQueueRecord);
}

/**
 * Removes a single queue entry by its autoIncrement id.
 * Called after a successful flush of that entry to the server.
 */
export async function dequeueAnswer(id: number): Promise<void> {
  const db = await openPlayerDB();
  await db.delete('answer_queue', id);
}

/**
 * Returns all queued entries for an attempt, sorted by queuedAt ASC (FIFO).
 * Uses the 'by-attempt' index for efficient lookup.
 */
export async function readQueue(
  attemptId: string,
): Promise<AnswerQueueRecord[]> {
  const db = await openPlayerDB();
  const tx = db.transaction('answer_queue', 'readonly');
  const entries = await tx
    .objectStore('answer_queue')
    .index('by-attempt')
    .getAll(attemptId);
  await tx.done;

  return entries.sort((a, b) => a.queuedAt - b.queuedAt);
}

/**
 * Deletes all queue entries for an attempt.
 * Called on successful submit + redirect, or on explicit logout.
 */
export async function clearQueue(attemptId: string): Promise<void> {
  const db = await openPlayerDB();
  const tx = db.transaction('answer_queue', 'readwrite');
  const store = tx.objectStore('answer_queue');
  const keys = await store.index('by-attempt').getAllKeys(attemptId);

  for (const key of keys) {
    await store.delete(key);
  }
  await tx.done;
}

// ─── Compound Cleanup ─────────────────────────────────────────────────────────

/**
 * Removes ALL IndexedDB data for a completed attempt.
 * Must be called immediately after a successful submit → redirect flow
 * (architecture §8.5: "delete immediately on redirect").
 */
export async function cleanupAttemptData(attemptId: string): Promise<void> {
  await Promise.all([
    deleteSession(attemptId),
    deleteAnswers(attemptId),
    clearQueue(attemptId),
  ]);
}

// ─── Stale-Session Pruning ────────────────────────────────────────────────────

/**
 * Deletes player_session records older than ageMs.
 * Called on player mount to prevent IndexedDB bloat from abandoned sessions.
 * Architecture §8.5: orphaned sessions deleted after 48 hours.
 *
 * @param ageMs - Maximum age in milliseconds (e.g. 48 * 60 * 60 * 1000).
 */
export async function pruneStaleSessionsOlderThan(
  ageMs: number,
): Promise<void> {
  const db = await openPlayerDB();
  const tx = db.transaction('player_session', 'readwrite');
  const store = tx.objectStore('player_session');
  const allSessions = await store.getAll();
  const cutoff = Date.now() - ageMs;

  for (const session of allSessions) {
    if (session.sessionOpenedAt < cutoff) {
      await store.delete(session.attemptId);
    }
  }
  await tx.done;
}
