'use client';

/**
 * Mock Player — useTimer hook
 *
 * Maintains a client-side countdown derived entirely from server data.
 *
 * ─── Server Authority Model ──────────────────────────────────────────────────
 *
 *   The server is the ONLY source of truth for exam time. This hook:
 *     - Computes:  deadline = new Date(startedAt).getTime() + durationSeconds * 1000
 *     - Computes:  remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
 *     - Dispatches SET_REMAINING every second
 *     - Dispatches EXPIRE_TIMER + calls onExpire() when remaining reaches 0
 *
 *   Date.now() is used ONLY as a display offset from the server-provided
 *   deadline. The server's Celery auto-submit task fires independently of
 *   what this hook does — the timer is display-only.
 *
 * ─── Timer Drift Handling ────────────────────────────────────────────────────
 *
 *   Device clocks can drift. Mitigation strategy (architecture §6.5):
 *
 *   1. Re-anchor on every focus/visibilitychange event:
 *        The shell re-fetches GET /attempts/{id}/ and dispatches LOAD_SESSION
 *        with fresh startedAt. This causes `startedAt` (a prop of this hook)
 *        to change, which restarts the useEffect below with a new deadline.
 *        The onFocusReanchor callback is provided by the shell to trigger
 *        that re-fetch.
 *
 *   2. On focus, this hook also immediately recomputes remaining from the
 *        CURRENT deadline (even before the server re-fetch resolves),
 *        so there is no visible stale value during the re-fetch window.
 *
 *   3. Gross drift (device clock set far into past/future) cannot be detected
 *        without a server time endpoint (OQ-01 — not in frozen API). The
 *        server's Celery task is the enforcement backstop regardless.
 *
 * ─── Tab Backgrounding ───────────────────────────────────────────────────────
 *
 *   Browsers throttle setInterval to ~1 min for background tabs. On foreground:
 *     - visibilitychange fires → onFocusReanchor called → server re-fetch
 *     - If status='submitted'/'scored' on re-fetch → shell redirects
 *     - If remaining <= 0 on re-anchor → EXPIRE_TIMER + onExpire()
 *
 * Props:
 *   startedAt       ISO UTC timestamp from server (the timer anchor)
 *   durationSeconds Total allowed seconds (from server)
 *   onExpire        Called exactly once when the client timer reaches zero.
 *                   Should trigger: flush queue → POST /submit/.
 *   onFocusReanchor Optional. Shell provides this to trigger a server re-fetch
 *                   on focus/tab-foreground. Not called when startedAt is empty.
 */

import { useEffect, useRef } from 'react';
import { usePlayerState } from './usePlayerState';

export interface UseTimerOptions {
  startedAt: string;
  durationSeconds: number;
  onExpire: () => void;
  onFocusReanchor?: () => void;
}

export function useTimer({
  startedAt,
  durationSeconds,
  onExpire,
  onFocusReanchor,
}: UseTimerOptions): void {
  const { dispatch } = usePlayerState();

  // Keep latest callbacks in refs so the interval/event handlers never hold
  // stale closures without the effect needing to restart.
  const onExpireRef = useRef(onExpire);
  const onFocusReanchorRef = useRef(onFocusReanchor);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    onFocusReanchorRef.current = onFocusReanchor;
  }, [onFocusReanchor]);

  useEffect(() => {
    // Guard: don't start the timer until the session is loaded and valid.
    if (!startedAt || durationSeconds <= 0) return;

    const deadline =
      new Date(startedAt).getTime() + durationSeconds * 1000;

    // Track whether we have already fired onExpire so we never fire it twice
    // even if the effect re-runs (e.g., after a re-anchor).
    let expired = false;

    /**
     * Computes remaining seconds from the current deadline and dispatches.
     * Returns false when the timer expired (so the caller can clear the interval).
     */
    function tick(): boolean {
      const remaining = Math.max(
        0,
        Math.floor((deadline - Date.now()) / 1000),
      );
      dispatch({ type: 'SET_REMAINING', payload: { seconds: remaining } });

      if (remaining <= 0 && !expired) {
        expired = true;
        dispatch({ type: 'EXPIRE_TIMER' });
        onExpireRef.current();
        return false; // stop
      }
      return true; // continue
    }

    // Dispatch immediately on mount/re-anchor (avoids a 1-second stale display).
    if (!tick()) return;

    const intervalId = setInterval(() => {
      if (!tick()) clearInterval(intervalId);
    }, 1000);

    // ── Re-anchor handlers ──────────────────────────────────────────────────

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      // 1. Immediately recompute from current deadline (instant feedback).
      //    If the timer expired while the tab was backgrounded, clear the
      //    interval so it stops dispatching SET_REMAINING(0) every second.
      if (!tick()) clearInterval(intervalId);
      // 2. Ask shell to refetch attempt for a fresh startedAt from server
      onFocusReanchorRef.current?.();
    }

    function handleFocus() {
      // Same: clear interval if timer expired via focus re-anchor.
      if (!tick()) clearInterval(intervalId);
      onFocusReanchorRef.current?.();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
    // Effect restarts when startedAt/durationSeconds change (fresh re-anchor
    // from server triggers a re-render with new props, resetting the deadline).
  }, [startedAt, durationSeconds, dispatch]);
}
