'use client';

/**
 * Mock Player — SubmitButton
 *
 * Opens the SubmitDialog on click. Disabled while submission is in progress
 * or after the timer expires (auto-submit already running).
 *
 * ─── Button State Table ───────────────────────────────────────────────────────
 *
 *   Condition                        │ Visible Text     │ State     │ HTML disabled
 *   ─────────────────────────────────┼──────────────────┼───────────┼──────────────
 *   Normal (idle, active exam)       │ "Submit Test"    │ enabled   │ false
 *   isSubmitting=true                │ "Submitting…"    │ disabled  │ true
 *   timerExpired=true                │ "Submitting…"    │ disabled  │ true
 *   (timerExpired drives auto-submit; isSubmitting becomes true shortly after)
 *
 * ─── Accessibility ────────────────────────────────────────────────────────────
 *
 *   <button> gives native Enter + Space keyboard support without custom handlers.
 *   aria-busy signals "in progress" to screen readers.
 *   aria-label provides the full accessible name with context.
 *   focus-visible:ring for keyboard navigation indicator.
 */

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';

export function SubmitButton() {
  const { state, dispatch } = usePlayerState();
  const t = useTranslations('player');
  const { isSubmitting, timerExpired } = state;

  // Disabled when already submitting OR when timer expired (auto-submit in flight)
  const isDisabled = isSubmitting || timerExpired;
  const isLoading = isSubmitting || timerExpired;

  return (
    <button
      type="button"
      onClick={() => {
        if (!isDisabled) dispatch({ type: 'OPEN_SUBMIT' });
      }}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-label={isLoading ? t('aria_submitting_wait') : t('aria_submit_test')}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
        'transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-offset-2 focus-visible:ring-indigo-500',
        isDisabled
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700',
      )}
    >
      {isLoading ? (
        <>
          {/* Inline spinner */}
          <span
            className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden="true"
          />
          {t('submitting')}
        </>
      ) : (
        t('submit_button')
      )}
    </button>
  );
}
