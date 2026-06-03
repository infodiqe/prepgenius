'use client';

/**
 * Mock Player — PaletteSummary
 *
 * Live counts derived from LocalAnswer state in PlayerContext.
 * Reads directly from context so it updates in real time as answers change.
 * No props, no backend calls.
 *
 * ─── Summary Calculation ─────────────────────────────────────────────────────
 *
 *   answered  = count of answers where state ∈ { answered, answered_marked }
 *   marked    = count of answers where state ∈ { marked, answered_marked }
 *   remaining = questionCount − answered
 *
 *   Note: answered_marked contributes to BOTH answered AND marked counts —
 *   it represents a question the student has answered AND flagged for review.
 *   The 'remaining' counter tells the student how many questions still need
 *   an answer before submission.
 *
 * ─── Anti-Cheat ───────────────────────────────────────────────────────────────
 *
 *   Counts are computed from state ∈ {not_visited, visited, answered, marked,
 *   answered_marked}. No correctness data is involved or accessible.
 *   This is a client-side display computation only; scoring is always server-side.
 */

import { useTranslations } from 'next-intl';
import { usePlayerState } from '../hooks/usePlayerState';

export function PaletteSummary() {
  const { state } = usePlayerState();
  const t = useTranslations('player');

  // ── Derive counts ────────────────────────────────────────────────────────────
  let answered = 0;
  let marked = 0;

  for (const answer of state.answers.values()) {
    if (answer.state === 'answered' || answer.state === 'answered_marked') {
      answered++;
    }
    if (answer.state === 'marked' || answer.state === 'answered_marked') {
      marked++;
    }
  }

  const remaining = state.questionCount - answered;

  return (
    <div
      className="flex flex-wrap gap-3 px-3 py-2 text-sm"
      aria-label={t('aria_palette_summary')}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Answered */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0"
          aria-hidden="true"
        />
        <span className="text-slate-600">
          {t('answered')}{' '}
          <strong className="text-slate-800 font-semibold">{answered}</strong>
        </span>
      </div>

      {/* Marked */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-3 h-3 rounded-sm bg-violet-600 shrink-0"
          aria-hidden="true"
        />
        <span className="text-slate-600">
          {t('action_marked')}{' '}
          <strong className="text-slate-800 font-semibold">{marked}</strong>
        </span>
      </div>

      {/* Remaining */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300 shrink-0"
          aria-hidden="true"
        />
        <span className="text-slate-600">
          {t('palette_remaining')}{' '}
          <strong className="text-slate-800 font-semibold">{remaining}</strong>
        </span>
      </div>
    </div>
  );
}
