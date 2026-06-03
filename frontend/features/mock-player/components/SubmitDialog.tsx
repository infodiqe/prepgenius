'use client';

/**
 * Mock Player — SubmitDialog
 *
 * Pre-submit confirmation modal. Computed from local PlayerState only — no
 * backend calls. Radix Dialog provides focus trapping, Escape handling, and
 * aria-modal automatically.
 *
 * ─── Summary Calculation ─────────────────────────────────────────────────────
 *
 *   answered  = count(LocalAnswer where state ∈ {answered, answered_marked})
 *   marked    = count(LocalAnswer where state ∈ {marked,  answered_marked})
 *   remaining = questionCount − answered
 *
 *   answered_marked contributes to both answered AND marked counts (student
 *   has answered and flagged). remaining = questions without any answer.
 *
 * ─── Accessibility ────────────────────────────────────────────────────────────
 *
 *   @radix-ui/react-dialog provides:
 *     ✓ Focus trap within dialog while open
 *     ✓ Escape key closes the dialog
 *     ✓ aria-modal="true" on Content
 *     ✓ role="dialog"
 *
 *   onOpenAutoFocus: initial focus is explicitly moved to Cancel so the
 *   student cannot accidentally confirm submission with Enter/Space.
 *
 *   Cancel uses Dialog.Close (triggers onOpenChange(false) → CLOSE_SUBMIT).
 *   Submit uses a plain button — avoids Radix auto-close so we can run
 *   the confirmation callback first, then close the dialog explicitly.
 */

import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';

interface SubmitDialogProps {
  /** Called when the student confirms submission (after the dialog is closed). */
  onConfirm: () => void;
}

export function SubmitDialog({ onConfirm }: SubmitDialogProps) {
  const { state, dispatch } = usePlayerState();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations('player');

  // ── Summary ─────────────────────────────────────────────────────────────────
  let answered = 0;
  let marked = 0;
  for (const a of state.answers.values()) {
    if (a.state === 'answered' || a.state === 'answered_marked') answered++;
    if (a.state === 'marked'   || a.state === 'answered_marked') marked++;
  }
  const remaining = state.questionCount - answered;

  const handleClose = () => dispatch({ type: 'CLOSE_SUBMIT' });

  return (
    <Dialog.Root
      open={state.submitDialogOpen}
      onOpenChange={(open) => { if (!open) handleClose(); }}
    >
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />

        {/* Panel */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50',
            '-translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] max-w-sm',
            'bg-white rounded-2xl shadow-2xl',
            'p-6',
            'focus:outline-none',
          )}
          // Put initial focus on Cancel so Enter/Space doesn't accidentally submit
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <Dialog.Title className="text-lg font-bold text-slate-800">
            {t('ready_to_submit')}
          </Dialog.Title>

          {/* Hidden description for screen readers */}
          <Dialog.Description className="sr-only">
            {t('review_summary')}
          </Dialog.Description>

          {/* ── Summary grid ─────────────────────────────────────────────────── */}
          <dl className="mt-4 divide-y divide-slate-50">
            <SummaryRow
              label={t('answered')}
              value={answered}
              className="text-emerald-600"
            />
            <SummaryRow
              label={t('marked_review')}
              value={marked}
              className="text-violet-600"
            />
            <SummaryRow
              label={t('unanswered')}
              value={remaining}
              className={remaining > 0 ? 'text-amber-600' : 'text-slate-600'}
            />
          </dl>

          {/* Warning when questions are unanswered */}
          {remaining > 0 && (
            <p className="mt-3 text-xs text-amber-600" role="alert">
              {remaining === 1
                ? t('unanswered_warning_singular', { count: remaining })
                : t('unanswered_warning_plural', { count: remaining })}
            </p>
          )}

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <div className="mt-6 flex gap-3">
            {/* Cancel — gets initial focus (safer default) */}
            <Dialog.Close asChild>
              <button
                ref={cancelRef}
                type="button"
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium',
                  'border border-slate-200 text-slate-700',
                  'hover:bg-slate-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                )}
              >
                {t('cancel')}
              </button>
            </Dialog.Close>

            {/* Submit — closes dialog then fires callback */}
            <button
              type="button"
              onClick={() => {
                handleClose();   // close dialog first
                onConfirm();     // then start submit
              }}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-semibold',
                'bg-indigo-600 text-white',
                'hover:bg-indigo-500 active:bg-indigo-700',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-offset-2 focus-visible:ring-indigo-500',
              )}
            >
              {t('submit_test')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={cn('text-sm font-bold', className)}>{value}</dd>
    </div>
  );
}
