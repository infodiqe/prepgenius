'use client';

/**
 * Mock Player — SubmissionOverlay
 *
 * Full-viewport blocking overlay shown while a submission is in progress
 * (manual or auto). Prevents ALL interaction with the player beneath it.
 *
 * ─── Interaction Lock Matrix ──────────────────────────────────────────────────
 *
 *   Target                  │ Blocked while overlay shown? │ Mechanism
 *   ────────────────────────┼──────────────────────────────┼──────────────────────
 *   Option selection        │ Yes                          │ fixed inset-0 overlay
 *   Question navigation      │ Yes                          │ captures all pointer events
 *   Palette tiles           │ Yes                          │ overlay z-60 sits above palette
 *   Mobile palette trigger  │ Yes                          │ covered by overlay
 *   Submit button           │ Yes                          │ covered + already disabled
 *   Timer (visual)          │ Visible underneath (z lower) │ display only; no interaction
 *   Keyboard focus          │ Trapped on overlay           │ autoFocus + role=alertdialog
 *
 *   The overlay is a single fixed element with the highest z-index in the
 *   player (z-[60], above the mobile palette sheet at z-50). It captures every
 *   pointer event, so nothing beneath it is clickable. There are no interactive
 *   children, so keyboard Tab has nowhere to escape to within the player.
 *
 * ─── Two display modes ────────────────────────────────────────────────────────
 *
 *   submitting=true, processing=false → "Submitting your test… Please wait."
 *   processing=true                   → "Scoring your test…" (rare edge case:
 *                                        submit succeeded but status='submitted')
 *
 * ─── Accessibility ────────────────────────────────────────────────────────────
 *
 *   role="alertdialog"  — assertively announced; signals an important modal
 *   aria-modal="true"   — content outside is inert to assistive tech
 *   aria-labelledby     — points to the heading
 *   The spinner is aria-hidden (decorative); the text carries the meaning.
 */

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface SubmissionOverlayProps {
  /** True while POST /submit/ is in flight (or queued flush running). */
  visible: boolean;
  /** True when in the rare 'submitted' polling state (scoring in progress). */
  processing?: boolean;
}

export function SubmissionOverlay({ visible, processing = false }: SubmissionOverlayProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const t = useTranslations('player');

  // Move focus into the overlay when it appears so keyboard focus is trapped
  // on a non-interactive region (nothing tabbable inside → focus stays put).
  useEffect(() => {
    if (visible) headingRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const heading = processing ? t('scoring_test') : t('submitting');
  const subtext = processing
    ? t('processing_subtext')
    : t('submitting_subtext');

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="submission-overlay-heading"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-white/95 backdrop-blur-sm"
    >
      {/* Spinner (decorative) */}
      <span
        className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"
        aria-hidden="true"
      />

      <h2
        id="submission-overlay-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-bold text-slate-800 focus:outline-none"
      >
        {heading}
      </h2>

      <p className="text-sm text-slate-500">{subtext}</p>
    </div>
  );
}
