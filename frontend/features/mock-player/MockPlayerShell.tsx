'use client';

/**
 * Mock Player Shell — Root Client Component
 *
 * Orchestrates the full player lifecycle:
 *   1. Load questions via TanStack Query
 *   2. Open IndexedDB and read session state
 *   3. Merge server answers with IndexedDB dirty answers
 *   4. Start attempt if status='created'
 *   5. Dispatch LOAD_SESSION → render player
 *   6. Manage timer, offline queue, and auto-submit
 *
 * ─── Merge Precedence Matrix ─────────────────────────────────────────────────
 *
 *   The server and IndexedDB may disagree when a save was queued offline.
 *   The canonical rule: **IndexedDB dirty=true always wins**.
 *   dirty=true means the client made a change that the server has not yet ACKed.
 *
 *   Server State  │ IDB State          │ dirty │ Result   │ Reason
 *   ──────────────┼────────────────────┼───────┼──────────┼─────────────────────
 *   answer A      │ answer B           │ true  │ IDB (B)  │ Client is ahead
 *   answer A      │ answer A           │ false │ server   │ Both agree; server is authoritative
 *   answer A      │ (no entry)         │  —    │ server   │ No local state
 *   (no answer)   │ answer B           │ true  │ IDB (B)  │ Client saved, not flushed yet
 *   (no answer)   │ answer B           │ false │ IDB (B)  │ Residual clean state; safe to use
 *   (no answer)   │ (no entry)         │  —    │ not_visited │ Neither has data
 *
 *   Example (from Phase 3 requirements):
 *     Server: selectedOptionId = A
 *     IDB:    selectedOptionId = B, dirty = true
 *     RESULT: B wins (IDB). Reason: the student selected B after the server
 *             last ACKed. The QUEUE_OFFLINE path stored B in IDB. When the
 *             server comes back online, the flush will POST B. Server state
 *             is stale.
 *
 * ─── Attempt Startup Sequence (status='created') ─────────────────────────────
 *
 *   Page RSC passes attemptStatus='created' and startedAt=null.
 *
 *   Shell init flow:
 *
 *   [Parallel]
 *     A. TanStack Query: loadPlayerQuestions(examId, mockTestId)
 *     B. useIndexedDB opens → isAvailable=true (or 1.5s timeout)
 *
 *   [After A+B]:
 *     C. Read IDB: currentIndex, answer states
 *     D. Merge answers (server existingAnswers[] + IDB)
 *     E. POST /start/ → server sets startedAt + durationSeconds
 *     F. dispatch LOAD_SESSION (with fresh startedAt from /start/ response)
 *
 *   After LOAD_SESSION: state.questionCount > 0 → skeleton disappears.
 *   After LOAD_SESSION: state.startedAt is set → useTimer starts interval.
 *
 * ─── Timer Initialization ─────────────────────────────────────────────────────
 *
 *   useTimer receives startedAt and durationSeconds from state (which comes
 *   from LOAD_SESSION). Because the effect deps are [startedAt, durationSeconds],
 *   the timer only starts after LOAD_SESSION sets valid values.
 *
 *   For 'in_progress' attempts: startedAt is non-null from the page RSC; timer
 *   starts as soon as questions + IDB are ready (no /start/ call needed).
 *
 *   Re-anchor: onFocusReanchor calls loadAttempt() to re-check status and
 *   redirect if the Celery task auto-submitted. startedAt is immutable after
 *   /start/ so the timer anchor doesn't change between focus events.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { useTranslations } from 'next-intl';

import { PlayerProvider } from './PlayerContext';
import { usePlayerState } from './hooks/usePlayerState';
import { useTimer } from './hooks/useTimer';
import { useIndexedDB } from './hooks/useIndexedDB';
import { useOfflineQueue } from './hooks/useOfflineQueue';
import { useSaveAnswer } from './hooks/useSaveAnswer';
import { PlayerLoadingSkeleton } from './components/PlayerLoadingSkeleton';
import { QuestionPanel } from './components/QuestionPanel';
import { QuestionPalette } from './components/QuestionPalette';
import { ExamTopBar } from './components/ExamTopBar';
import { OfflineBanner } from './components/OfflineBanner';
import { SubmitDialog } from './components/SubmitDialog';
import { SubmissionOverlay } from './components/SubmissionOverlay';
import { QuestionActionBar } from './components/QuestionActionBar';

import { loadPlayerQuestions } from './services/questionService';
import {
  loadAttempt,
  startAttempt,
  submitAttempt,
} from './services/playerSessionService';

import type { components } from '@/lib/api/types';
import type {
  AttemptType,
  AttemptStatus,
  QuestionSlot,
  LocalAnswer,
  QuestionState,
} from './types';

// ─── Props ────────────────────────────────────────────────────────────────────

type StrippedAnswer = Omit<components['schemas']['UserAnswerRead'], 'is_correct'>;

export interface MockPlayerShellProps {
  attemptId: string;
  examId: string;
  mockTestId: string | null;
  attemptType: AttemptType;
  attemptStatus: AttemptStatus;
  startedAt: string | null;
  durationSeconds: number | null;
  /** Server-acknowledged answers with is_correct stripped by page.tsx RSC */
  existingAnswers: StrippedAnswer[];
  /**
   * Where to navigate once the attempt is finalised (submitted/scored).
   * Defaults to the standard results page; the diagnostic flow (SPR1-HOTFIX-02)
   * passes `/diagnostic/{attemptId}`. ONLY the redirect destination changes —
   * timer, anti-cheat, offline queue, answer handling and scoring are untouched.
   */
  completionHref?: string;
}

// ─── Answer merge ─────────────────────────────────────────────────────────────

/**
 * Builds the initial answers Map from server + IDB state.
 * Precedence: dirty IDB > server > clean IDB > not_visited default.
 * See the merge matrix in the module header.
 */
function buildAnswersMap(
  questions: QuestionSlot[],
  serverAnswers: StrippedAnswer[],
  idbAnswers: LocalAnswer[],
): Map<string, LocalAnswer> {
  const serverMap = new Map(serverAnswers.map((a) => [a.question_id, a]));
  const idbMap = new Map(idbAnswers.map((a) => [a.questionId, a]));
  const result = new Map<string, LocalAnswer>();

  for (const question of questions) {
    const serverAns = serverMap.get(question.id);
    const idbAns = idbMap.get(question.id);

    if (idbAns?.dirty === true) {
      // Client is ahead of server — use IDB (will flush on next online event)
      result.set(question.id, idbAns);
    } else if (serverAns) {
      // Server acknowledged state; use it (both agree when dirty=false)
      result.set(question.id, {
        questionId: serverAns.question_id,
        selectedOptionId: serverAns.selected_option_id,
        state: serverAns.state as QuestionState,
        timeSpentSeconds: serverAns.time_spent_seconds,
        dirty: false,
        lastModifiedAt: serverAns.answered_at
          ? new Date(serverAns.answered_at).getTime()
          : Date.now(),
      });
    } else if (idbAns) {
      // Residual clean IDB state (no server answer; safe to use)
      result.set(question.id, idbAns);
    } else {
      // Neither server nor IDB has data — default not_visited
      result.set(question.id, {
        questionId: question.id,
        selectedOptionId: null,
        state: 'not_visited',
        timeSpentSeconds: 0,
        dirty: false,
        lastModifiedAt: Date.now(),
      });
    }
  }

  return result;
}

// ─── Inner component (uses PlayerContext) ─────────────────────────────────────

function PlayerCore({
  attemptId,
  examId,
  mockTestId,
  attemptType,
  attemptStatus,
  startedAt: initialStartedAt,
  durationSeconds: initialDurationSeconds,
  existingAnswers,
  completionHref,
}: MockPlayerShellProps) {
  const { state, dispatch } = usePlayerState();
  const router = useRouter();
  const idb = useIndexedDB();
  const t = useTranslations('player');

  // Single finalisation destination (SPR1-HOTFIX-02). Defaults to the standard
  // results page so non-diagnostic attempts are unchanged.
  const resolvedCompletionHref = completionHref ?? `/results/${attemptId}`;

  // ── Save hook (P0-1: wires SELECT_OPTION saves; P1-1: initial visited save) ─
  const { saveAnswer } = useSaveAnswer();
  // Ref so the init() closure can call saveAnswer without it being in deps
  const saveAnswerRef = useRef(saveAnswer);
  saveAnswerRef.current = saveAnswer;

  // ── Offline queue ───────────────────────────────────────────────────────────

  const handleAttemptAutoSubmitted = useCallback(() => {
    router.push(resolvedCompletionHref);
  }, [router, resolvedCompletionHref]);

  const { flushNow } = useOfflineQueue(handleAttemptAutoSubmitted);

  // ── Questions via TanStack Query (staleTime: Infinity — immutable per session)

  const questionsQuery = useQuery({
    queryKey: ['player-questions', examId, mockTestId] as const,
    queryFn: () => loadPlayerQuestions(examId, mockTestId!),
    staleTime: Infinity,
    enabled: !!mockTestId,
  });

  // ── IDB timeout fallback (handles Safari private mode / unavailable IDB) ───

  const [idbTimedOut, setIdbTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIdbTimedOut(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // ── Session initialisation (runs exactly once) ─────────────────────────────

  const sessionLoadedRef = useRef(false);

  useEffect(() => {
    // Wait until questions are loaded AND IDB has either opened or timed out
    if (!questionsQuery.data) return;
    if (!idb.isAvailable && !idbTimedOut) return;
    if (sessionLoadedRef.current) return;

    let cancelled = false;

    async function init() {
      const questions = questionsQuery.data!;

      // ── Read IDB session state ──────────────────────────────────────────────
      const idbSession = await idb.readSession(attemptId);
      const idbAnswers = await idb.readAnswers(attemptId);
      const currentIndex = idbSession?.currentIndex ?? 0;

      if (cancelled) return;

      // ── Start attempt if created ────────────────────────────────────────────
      // Do this before LOAD_SESSION so the timer anchor is valid from the start.
      let finalStartedAt = initialStartedAt ?? '';
      let finalDurationSeconds = initialDurationSeconds ?? 0;
      let finalStatus: AttemptStatus = attemptStatus;

      if (attemptStatus === 'created') {
        try {
          const freshMeta = await startAttempt(attemptId);
          if (cancelled) return;
          finalStartedAt = freshMeta.startedAt ?? '';
          finalDurationSeconds = freshMeta.durationSeconds ?? 0;
          finalStatus = freshMeta.attemptStatus;
        } catch {
          if (cancelled) return;
          // P0-2 FIX: startAttempt may fail with 400 when the attempt was
          // already started by a prior call — this happens in React 18 Strict
          // Mode (effects run twice: first mount is cancelled mid-flight, second
          // mount calls startAttempt again on an already-in_progress attempt).
          // Recovery: re-fetch the attempt to get the current timer anchor.
          try {
            const { attempt: current } = await loadAttempt(attemptId);
            if (cancelled) return;
            finalStartedAt = current.startedAt ?? '';
            finalDurationSeconds = current.durationSeconds ?? 0;
            finalStatus = current.attemptStatus;
          } catch {
            if (cancelled) return;
            // Network failure on recovery fetch; timer anchor stays empty.
            // The player renders but the timer won't start until the user
            // refreshes. The server's Celery task enforces timing regardless.
          }
        }
      }

      // ── Merge server + IDB answers ──────────────────────────────────────────
      const answers = buildAnswersMap(questions, existingAnswers, idbAnswers);

      // ── Write session to IDB (persist navigation position) ─────────────────
      await idb.writeSession({
        attemptId,
        examId,
        mockTestId: mockTestId ?? '',
        attemptType,
        currentIndex,
        sessionOpenedAt: Date.now(),
      });

      if (cancelled) return;

      // ── Hydrate the reducer ─────────────────────────────────────────────────
      dispatch({
        type: 'LOAD_SESSION',
        payload: {
          attemptId,
          examId,
          mockTestId,
          attemptType,
          attemptStatus: finalStatus,
          startedAt: finalStartedAt,
          durationSeconds: finalDurationSeconds,
          questions,
          answers,
          currentIndex,
        },
      });

      // ── P1-1 FIX: mark the initially displayed question as visited ───────────
      // The reducer's not_visited→visited transition only fires via NAVIGATE_TO.
      // Without this, Q1 is never marked visited until the student navigates away.
      // NAVIGATE_TO(currentIndex) transitions the question AT currentIndex:
      //   state after LOAD_SESSION → questions[currentIndex] → mark visited
      // React 18 batches both dispatches; NAVIGATE_TO sees state from LOAD_SESSION.
      const firstQ = questions[currentIndex];
      if (firstQ) {
        const initAnswer = answers.get(firstQ.id);
        if (!initAnswer || initAnswer.state === 'not_visited') {
          dispatch({ type: 'NAVIGATE_TO', payload: { index: currentIndex } });
          void saveAnswerRef.current(firstQ.id, null, 'visited', 0);
        }
      }

      // ── Flush any queued offline answers from a previous session ────────────
      void flushNow();

      sessionLoadedRef.current = true;
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [
    questionsQuery.data,
    idb.isAvailable,
    idb.readSession,
    idb.readAnswers,
    idb.writeSession,
    idbTimedOut,
    dispatch,
    flushNow,
    attemptId,
    examId,
    mockTestId,
    attemptType,
    attemptStatus,
    initialStartedAt,
    initialDurationSeconds,
    existingAnswers,
  ]);

  // ── Persist currentIndex to IDB on navigation ───────────────────────────────
  useEffect(() => {
    if (!state.questionCount) return; // not yet loaded
    void idb.writeSession({
      attemptId,
      examId,
      mockTestId: mockTestId ?? '',
      attemptType,
      currentIndex: state.currentIndex,
      sessionOpenedAt: Date.now(),
    });
  }, [
    state.currentIndex,
    state.questionCount,
    idb.writeSession,
    attemptId,
    examId,
    mockTestId,
    attemptType,
  ]);

  // ── P1-4 FIX: per-question time tracking ─────────────────────────────────────
  // Dispatches TICK_TIME every second for the currently displayed question.
  // Time is accumulated in LocalAnswer.timeSpentSeconds and piggy-backed onto
  // the next answer-save (SELECT_OPTION, TOGGLE_MARK, etc.) — not saved every
  // second. Stops when the timer expires or submission begins.
  useEffect(() => {
    const question = state.questions[state.currentIndex];
    if (!question || !state.questionCount || state.timerExpired || state.isSubmitting) return;

    const intervalId = setInterval(() => {
      dispatch({ type: 'TICK_TIME', payload: { questionId: question.id } });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [
    state.currentIndex,
    state.questions,
    state.questionCount,
    state.timerExpired,
    state.isSubmitting,
    dispatch,
  ]);

  // ── Submit state machine ──────────────────────────────────────────────────
  //
  //   idle ──(executeSubmit)──► submitting ──► completed (redirect)
  //                                  │
  //                                  └──► processing (poll) ──► completed
  //                                  └──► error (retry) ──► submitting
  //
  //   DOUBLE-SUBMIT PROTECTION (§6): a synchronous ref guard, set BEFORE any
  //   await, is the single gate into 'submitting'. state.isSubmitting alone is
  //   insufficient because React state updates are async — a double-click or a
  //   timer-expiry-during-manual-submit could both pass an `if (state.isSubmitting)`
  //   check before the first re-render. The ref flips synchronously, so only the
  //   first caller proceeds; all others return immediately.

  const SUBMIT_FLUSH_TIMEOUT_MS = 10_000;
  const POLL_INTERVAL_MS = 3_000;
  const POLL_MAX_ATTEMPTS = 15; // ~45 s ceiling before redirecting anyway

  const submitInFlightRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const redirectToResults = useCallback(async () => {
    await idb.cleanupAttemptData(attemptId);
    router.push(resolvedCompletionHref);
  }, [idb, attemptId, router, resolvedCompletionHref]);

  // Poll GET /attempts/{id}/ for the rare 'submitted' (scoring failed) edge case.
  const startPolling = useCallback(() => {
    setIsProcessing(true);
    stopPolling();
    let attempts = 0;
    pollIntervalRef.current = setInterval(() => {
      void (async () => {
        attempts++;
        try {
          const { attempt } = await loadAttempt(attemptId);
          if (attempt.attemptStatus === 'scored') {
            stopPolling();
            await redirectToResults();
            return;
          }
        } catch {
          // Transient error; keep polling until the attempt ceiling.
        }
        if (attempts >= POLL_MAX_ATTEMPTS) {
          // Give up waiting; redirect anyway — results page renders pending state.
          stopPolling();
          await redirectToResults();
        }
      })();
    }, POLL_INTERVAL_MS);
  }, [attemptId, stopPolling, redirectToResults]);

  // The single entry point into submission. Used by BOTH manual and auto submit.
  const executeSubmit = useCallback(async () => {
    // ── Synchronous double-submit guard (the only gate into 'submitting') ───
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;

    setSubmitError(null);
    dispatch({ type: 'CLOSE_SUBMIT' });   // close dialog if it was open
    dispatch({ type: 'START_SUBMITTING' }); // shows overlay, disables button

    // ── Queue safety (§7): flush MUST fully drain before we submit ──────────
    // flushNow() resolves true when drained, false when entries remain.
    // A 10 s timeout resolves false so a hung flush cannot block forever.
    const flushTimeout = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), SUBMIT_FLUSH_TIMEOUT_MS),
    );
    let flushed = false;
    try {
      flushed = await Promise.race([flushNow(), flushTimeout]);
    } catch {
      flushed = false;
    }

    if (!flushed) {
      // Entries still queued → NEVER submit. Stop, show error, allow retry.
      submitInFlightRef.current = false;
      dispatch({ type: 'END_SUBMITTING' });
      setSubmitError(
        t('save_sync_failed'),
      );
      return;
    }

    // ── POST /attempts/{id}/submit/ (auto-scores via backend hotfix) ────────
    try {
      const result = await submitAttempt(attemptId);
      if (result.status === 'scored') {
        await redirectToResults();
        return; // navigating away; keep ref locked
      }
      // status === 'submitted' (rare): scoring did not chain — poll for it.
      startPolling();
      return; // keep ref locked; polling owns the lifecycle now
    } catch {
      // Submit POST failed. Re-check status: the attempt may already be
      // finalised (Celery auto-submit beat us), or this is a real network error.
      try {
        const { attempt } = await loadAttempt(attemptId);
        if (attempt.attemptStatus === 'scored') {
          await redirectToResults();
          return;
        }
        if (attempt.attemptStatus === 'submitted') {
          startPolling();
          return;
        }
      } catch {
        // Status re-check also failed; fall through to retry path.
      }
      submitInFlightRef.current = false;
      dispatch({ type: 'END_SUBMITTING' });
      setSubmitError(
        t('submit_failed'),
      );
    }
  }, [dispatch, flushNow, attemptId, redirectToResults, startPolling]);

  // Auto-submit on timer expiry → same single entry point, no dialog/confirm.
  const handleAutoSubmit = useCallback(() => {
    void executeSubmit();
  }, [executeSubmit]);

  // Stop polling on unmount (no leaked intervals).
  useEffect(() => stopPolling, [stopPolling]);

  // ── Focus re-anchor (called by timer on visibility/focus) ───────────────────
  // Re-checks attempt status; startedAt is immutable so no timer recalculation.

  const handleFocusReanchor = useCallback(async () => {
    try {
      const { attempt } = await loadAttempt(attemptId);
      if (
        attempt.attemptStatus === 'scored' ||
        attempt.attemptStatus === 'submitted'
      ) {
        router.push(resolvedCompletionHref);
      }
      // If still in_progress: startedAt hasn't changed; timer continues.
    } catch {
      // Network error during focus re-check; timer continues from last state.
    }
  }, [attemptId, router, resolvedCompletionHref]);

  // ── Timer ────────────────────────────────────────────────────────────────────
  // Started automatically when state.startedAt becomes non-empty (after LOAD_SESSION).

  useTimer({
    startedAt: state.startedAt,
    durationSeconds: state.durationSeconds,
    onExpire: handleAutoSubmit,
    onFocusReanchor: handleFocusReanchor,
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  // P1-3 FIX: query error → finite error state instead of infinite skeleton.
  // questionsQuery.isError is true when all TanStack retries are exhausted
  // (network down, 404, etc.). Without this check, !state.questionCount keeps
  // showing the skeleton forever with no recovery path.
  if (!state.questionCount) {
    if (questionsQuery.isError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 bg-white px-4">
          <p className="text-sm text-slate-600 text-center max-w-xs">
            {t('load_questions_failed')}
          </p>
          <button
            type="button"
            onClick={() => void questionsQuery.refetch()}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {t('try_again')}
          </button>
        </div>
      );
    }
    return <PlayerLoadingSkeleton />;
  }

  // Phase 4+ components (ExamTopBar, QuestionPanel, etc.) mount here.
  // For Phase 3: minimal frame that confirms the player is operational.
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
      {/* Phase 8 Sticky Header */}
      <ExamTopBar />

      {/* ── Content area: question + palette ────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question column */}
        <main
          className="flex-1 flex flex-col overflow-hidden"
          role="main"
        >
          {/* Phase 4: QuestionPanel */}
          <QuestionPanel />

          {/* Phase 6 action bar replacing placeholder */}
          <QuestionActionBar />
        </main>

        {/* Phase 5: QuestionPalette (desktop always visible, mobile as sheet) */}
        <QuestionPalette />
      </div>

      {/* Phase 7: pre-submit confirmation dialog (manual submit only) */}
      <SubmitDialog onConfirm={() => void executeSubmit()} />

      {/* Phase 7: blocking overlay while submitting / scoring (manual + auto) */}
      <SubmissionOverlay
        visible={state.isSubmitting || isProcessing}
        processing={isProcessing}
      />

      {/* Phase 8: Offline banner */}
      <OfflineBanner />

      {/* Phase 7: submit failure → error + retry (queue flush or POST failed) */}
      {submitError !== null && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="submit-error-heading"
          aria-describedby="submit-error-message"
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-white/95 px-6 backdrop-blur-sm"
        >
          <h2
            id="submit-error-heading"
            className="text-lg font-bold text-slate-800 text-center"
          >
            {t('submit_failed_title')}
          </h2>
          <p
            id="submit-error-message"
            className="text-sm text-slate-600 text-center max-w-xs"
          >
            {submitError}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => setSubmitError(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t('keep_working')}
            </button>
            <button
              type="button"
              onClick={() => void executeSubmit()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
            >
              {t('try_again')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Public export — wraps PlayerCore in context provider ─────────────────────

export function MockPlayerShell(props: MockPlayerShellProps) {
  const t = useTranslations('player');

  if (!props.mockTestId) {
    // All attempt types — including practice (topic/subject/mixed), which carry a
    // server-generated custom MockTest (T28) — have a mock_test_id. A missing one
    // is a malformed attempt; page.tsx guards this too (belt-and-suspenders).
    return (
      <div className="flex items-center justify-center h-screen text-sm text-slate-500">
        {t('session_unavailable')}
      </div>
    );
  }

  return (
    <PlayerProvider>
      <PlayerCore {...props} />
    </PlayerProvider>
  );
}
