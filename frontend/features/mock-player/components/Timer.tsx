'use client';

/**
 * Mock Player — Timer
 *
 * Displays the countdown derived from PlayerContext.remainingSeconds.
 * The client timer is display-only; the server's Celery task enforces time.
 *
 * ─── Display Format ───────────────────────────────────────────────────────────
 *
 *   remainingSeconds >= 3600  →  HH:MM:SS   (e.g. "01:47:23")
 *   remainingSeconds  < 3600  →  MM:SS       (e.g. "14:30", "00:45")
 *
 * ─── Timer State Transition Table ────────────────────────────────────────────
 *
 *   remainingSeconds  │ Visual state   │ CSS class
 *   ──────────────────┼────────────────┼──────────────────────
 *   > 300 (5 min)     │ default        │ text-slate-700
 *   > 60  (1 min)     │ amber warning  │ text-amber-500
 *   > 0   (< 1 min)   │ red warning    │ text-red-500
 *   = 0 / expired     │ red warning    │ text-red-500  (shows "0:00")
 *
 * ─── Accessibility ────────────────────────────────────────────────────────────
 *
 *   role="timer" aria-live="off" — the browser announces role but NOT the
 *   content every second (aria-live="off" prevents this noise).
 *
 *   Separate SR-only alert region fires at EXACTLY THREE moments:
 *     1. ≤ 5 minutes remaining (once, first crossing only)
 *     2. ≤ 1 minute remaining  (once, first crossing only)
 *     3. Timer expired         (once)
 *
 *   No announcements for intermediate ticks — per architecture §16.2.
 *
 * ─── No Animations ────────────────────────────────────────────────────────────
 *
 *   No countdown animation, no blinking, no color-change transitions.
 *   Color state applies immediately (instant class swap).
 *   The prefers-reduced-motion media query is satisfied by default since
 *   there are no animations to disable.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';

// Millisecond thresholds for warning states
const WARN_AMBER_S = 5 * 60;  // 300 s — amber warning below this
const WARN_RED_S   = 1 * 60;  // 60 s  — red warning below this

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Timer() {
  const { state } = usePlayerState();
  const t = useTranslations('player');
  const { remainingSeconds, timerExpired } = state;

  // ── Screen-reader milestones ───────────────────────────────────────────────
  // Each fires at most once; refs persist across re-renders without causing them.
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const fired5min = useRef(false);
  const fired1min = useRef(false);
  const firedExpired = useRef(false);

  useEffect(() => {
    if (timerExpired && !firedExpired.current) {
      firedExpired.current = true;
      setSrAnnouncement(t('alert_time_expired'));
    } else if (remainingSeconds <= WARN_RED_S && remainingSeconds > 0 && !fired1min.current) {
      fired1min.current = true;
      setSrAnnouncement(t('alert_time_remaining_1m'));
    } else if (
      remainingSeconds <= WARN_AMBER_S &&
      remainingSeconds > WARN_RED_S &&
      !fired5min.current
    ) {
      fired5min.current = true;
      setSrAnnouncement(t('alert_time_remaining_5m'));
    }
  }, [remainingSeconds, timerExpired, t]);

  // ── Visual state ───────────────────────────────────────────────────────────
  const colorCn =
    timerExpired || remainingSeconds <= WARN_RED_S
      ? 'text-red-500'
      : remainingSeconds <= WARN_AMBER_S
        ? 'text-amber-500'
        : 'text-slate-700';

  const displayTime = timerExpired
    ? formatTime(0)
    : formatTime(remainingSeconds);

  return (
    <div className="flex items-center" aria-label={t('timer_label')}>
      {/* ── Visible countdown ────────────────────────────────────────────── */}
      <span
        role="timer"
        aria-live="off"
        aria-label={
          timerExpired || remainingSeconds <= 0
            ? t('time_expired')
            : t('time_remaining', { time: displayTime })
        }
        className={cn('font-mono text-sm font-semibold tabular-nums', colorCn)}
      >
        {displayTime}
      </span>

      {/* ── SR-only alert region ─────────────────────────────────────────── */}
      {/* Fires assertively at the 3 allowed milestones only (never every tick). */}
      <span
        role="alert"
        aria-live="assertive"
        className="sr-only"
      >
        {srAnnouncement}
      </span>
    </div>
  );
}
