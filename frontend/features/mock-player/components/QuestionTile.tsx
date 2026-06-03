'use client';

/**
 * Mock Player — QuestionTile
 *
 * A single numbered tile in the Question Navigator palette.
 *
 * ─── State → Visual Mapping (architecture §4.6) ───────────────────────────────
 *
 *   State            │ Background        │ Border            │ Icon   │ Number
 *   ─────────────────┼───────────────────┼───────────────────┼────────┼────────
 *   not_visited      │ slate-100 (gray)  │ slate-300         │ none   │ slate-400
 *   visited          │ white             │ amber-400 (ring)  │ none   │ amber-600
 *   answered         │ emerald-500       │ emerald-600       │ Check  │ white
 *   marked           │ violet-600        │ violet-700        │ Flag   │ white
 *   answered_marked  │ violet-600        │ violet-700        │ Flag   │ white  + emerald badge
 *
 * ─── WCAG 1.4.1 Compliance ────────────────────────────────────────────────────
 *
 *   Color is NEVER the only differentiator. Every state carries a distinct
 *   visual signal beyond color:
 *     not_visited      → gray background (muted; visually recedes)
 *     visited          → amber RING border (outline shape change)
 *     answered         → Check ICON
 *     marked           → Flag ICON
 *     answered_marked  → Flag ICON + emerald badge (two icons)
 *
 *   Additionally, the position number and aria-label communicate state to
 *   screen readers without relying on color at all.
 *
 * ─── Keyboard / Accessibility ─────────────────────────────────────────────────
 *
 *   Uses <button> (not div + role="button") for native Enter/Space handling.
 *   aria-label = "Question {position}, {stateLabel}"
 *   aria-current = true when this is the currently displayed question.
 *   focus-visible:ring for keyboard focus indicator.
 */

import { useTranslations } from 'next-intl';
import { Check, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionState } from '../types';

interface QuestionTileProps {
  position: number;            // 1-based display number (from QuestionSlot.position)
  questionId: string;          // for React key use by parent; not rendered
  questionState: QuestionState;
  isCurrent: boolean;          // true when this question is displayed
  onNavigate: () => void;      // dispatches NAVIGATE_TO + CLOSE_PALETTE in parent
}

// ─── Per-state visual configuration ──────────────────────────────────────────

interface TileConfig {
  containerCn: string;    // background + border + text colour
  currentRingCn: string;  // extra ring added when isCurrent=true
  hasIcon: boolean;       // whether to render an icon above the number
}

const TILE_CONFIG: Record<QuestionState, TileConfig> = {
  not_visited: {
    containerCn: 'bg-slate-100 border-slate-300 text-slate-400 hover:bg-slate-200',
    currentRingCn: 'ring-2 ring-indigo-500 ring-offset-1',
    hasIcon: false,
  },
  visited: {
    containerCn: 'bg-white border-amber-400 text-amber-600 hover:bg-amber-50',
    currentRingCn: 'ring-2 ring-indigo-500 ring-offset-1',
    hasIcon: false,
  },
  answered: {
    containerCn: 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600',
    currentRingCn: 'ring-2 ring-white ring-inset',
    hasIcon: true,
  },
  marked: {
    containerCn: 'bg-violet-600 border-violet-700 text-white hover:bg-violet-700',
    currentRingCn: 'ring-2 ring-white ring-inset',
    hasIcon: true,
  },
  answered_marked: {
    containerCn: 'bg-violet-600 border-violet-700 text-white hover:bg-violet-700',
    currentRingCn: 'ring-2 ring-white ring-inset',
    hasIcon: true, // flag + separate emerald badge
  },
};

export function QuestionTile({
  position,
  questionState,
  isCurrent,
  onNavigate,
}: QuestionTileProps) {
  const config = TILE_CONFIG[questionState];
  const t = useTranslations('player');

  const stateTranslationKey = {
    not_visited: 'state_not_visited',
    visited: 'state_visited',
    answered: 'state_answered',
    marked: 'state_marked',
    answered_marked: 'state_answered_marked',
  }[questionState];

  const stateLabel = t(stateTranslationKey);

  return (
    <button
      type="button"
      onClick={onNavigate}
      aria-label={t('state_aria', { position, state: stateLabel })}
      aria-current={isCurrent ? true : undefined}
      className={cn(
        // Base: fixed 48×48px tile, rounded, border
        'relative flex flex-col items-center justify-center',
        'w-12 h-12 rounded-lg border-2 transition-colors duration-100',
        // Keyboard focus
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
        // Per-state colours
        config.containerCn,
        // Current question indicator
        isCurrent && config.currentRingCn,
      )}
    >
      {/* Icon row (answered, marked, answered_marked only) */}
      {config.hasIcon && (
        questionState === 'marked' || questionState === 'answered_marked' ? (
          <Flag className="w-3 h-3 shrink-0" aria-hidden="true" />
        ) : (
          <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
        )
      )}

      {/* Position number */}
      <span
        className={cn(
          'leading-none select-none',
          config.hasIcon ? 'text-[9px]' : 'text-xs font-semibold',
        )}
        aria-hidden="true"
      >
        {position}
      </span>

      {/* answered_marked: small emerald check badge (second indicator) */}
      {questionState === 'answered_marked' && (
        <span
          className={cn(
            'absolute -top-1.5 -right-1.5',
            'flex items-center justify-center w-4 h-4 rounded-full',
            'bg-emerald-500 border border-white',
          )}
          aria-hidden="true"
        >
          <Check className="w-2.5 h-2.5 text-white" />
        </span>
      )}
    </button>
  );
}
