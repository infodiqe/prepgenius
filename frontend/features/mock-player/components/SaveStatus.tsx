'use client';

/**
 * Mock Player — SaveStatus
 *
 * Displays the current auto-save state as a small inline indicator.
 * Reads saveStatus from PlayerContext; never dispatches actions.
 *
 * ─── SaveStatus Visual State Table ───────────────────────────────────────────
 *
 *   saveStatus  │ Visible  │ Icon               │ Text                      │ Colour
 *   ────────────┼──────────┼────────────────────┼───────────────────────────┼─────────────
 *   idle        │ No       │ —                  │ —                         │ —
 *   saving      │ Yes      │ Loader2 (spin)     │ "Saving…"                 │ slate
 *   saved       │ Yes      │ Check              │ "Saved"                   │ emerald
 *   queued      │ Yes      │ WifiOff            │ "Offline — queued"        │ amber
 *   failed      │ Yes      │ AlertTriangle      │ "Save failed — tap to retry" │ amber
 *
 * ─── "Saved → Idle" transition ───────────────────────────────────────────────
 *
 *   useSaveAnswer already dispatches SET_SAVE_STATUS('idle') 3 seconds after
 *   'saved'. SaveStatus observes this naturally: when saveStatus becomes 'idle'
 *   the component returns null (hidden). No local timer or reducer mutation
 *   in this component.
 *
 * ─── Accessibility ────────────────────────────────────────────────────────────
 *
 *   The live region container is always in the DOM so screen readers monitor it
 *   continuously. Only the CONTENT changes; this triggers polite announcements.
 *
 *   role="status" implies aria-live="polite" + aria-atomic="true".
 *   Using an explicit aria-label on each visible state so the full description
 *   is available (not just the short visible text).
 *
 * ─── Performance ─────────────────────────────────────────────────────────────
 *
 *   saveStatus changes at most a few times per interaction, not per second.
 *   No polling, no setInterval, no local timers. Pure context read.
 */

import { Loader2, Check, WifiOff, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';

// ─── Per-state content configuration ──────────────────────────────────────────

interface StateContentConfig {
  icon: React.ReactNode;
  containerCn: string;
  textKey: 'save_saving' | 'save_saved' | 'save_offline_queued' | 'save_failed_retry';
  srLabelKey: 'sr_save_saving' | 'sr_save_saved' | 'sr_save_offline_queued' | 'sr_save_failed';
}

function getStatusConfig(saveStatus: string): StateContentConfig | null {
  switch (saveStatus) {
    case 'saving':
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />,
        containerCn: 'text-slate-500',
        textKey: 'save_saving',
        srLabelKey: 'sr_save_saving',
      };
    case 'saved':
      return {
        icon: <Check className="w-3 h-3" aria-hidden="true" />,
        containerCn: 'text-emerald-600',
        textKey: 'save_saved',
        srLabelKey: 'sr_save_saved',
      };
    case 'queued':
      return {
        icon: <WifiOff className="w-3 h-3" aria-hidden="true" />,
        containerCn: 'text-amber-600',
        textKey: 'save_offline_queued',
        srLabelKey: 'sr_save_offline_queued',
      };
    case 'failed':
      return {
        icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" />,
        containerCn: 'text-amber-600',
        textKey: 'save_failed_retry',
        srLabelKey: 'sr_save_failed',
      };
    default: // 'idle'
      return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SaveStatus() {
  const { state } = usePlayerState();
  const { saveStatus } = state;
  const t = useTranslations('player');

  const config = getStatusConfig(saveStatus);

  return (
    /*
     * The container is always rendered in the DOM so the live region persists.
     * When idle: the container is sr-only (screen readers still monitor it but
     * no visual is shown). When active: full display.
     *
     * role="status" = aria-live="polite" + aria-atomic="true" by spec.
     */
    <div
      role="status"
      aria-label={config ? t(config.srLabelKey) : t('sr_save_idle')}
      className={cn(
        'flex items-center gap-1.5 text-xs transition-opacity duration-150',
        config === null
          ? 'sr-only'
          : config.containerCn,
      )}
    >
      {config !== null && (
        <>
          {config.icon}
          <span>{t(config.textKey)}</span>
        </>
      )}
    </div>
  );
}
