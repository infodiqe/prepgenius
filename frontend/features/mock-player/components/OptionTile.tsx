'use client';

/**
 * Mock Player — OptionTile
 *
 * A single answer option rendered as a <button>.
 *
 * ─── Why <button>, not <input type="radio"> ──────────────────────────────────
 *
 *   Architecture §16.4: "Each option is rendered as a <button> (not a radio
 *   input) to maximize control over keyboard and touch behavior."
 *   Using <button> gives full control over visual state without fighting
 *   browser-native radio appearance. aria-pressed replaces the
 *   checked/unchecked semantic.
 *
 * ─── Permitted Visual States ─────────────────────────────────────────────────
 *
 *   ALLOWED:    unselected | selected | focus-visible | disabled
 *   FORBIDDEN:  correct | incorrect | success | failure | hint
 *
 *   The component receives only `isSelected: boolean`. There is no is_correct
 *   prop, no correctness variant, no green/red coloring. The OptionTile type
 *   enforces this — adding a correctness prop requires modifying this interface,
 *   which is a deliberate friction point (architecture §18.2).
 *
 * ─── Touch Target ─────────────────────────────────────────────────────────────
 *
 *   The outer <button> has min-height 52px (>= 44px WCAG 2.5.5 AAA target).
 *   Full row width ensures the entire tile is tappable, not just the text.
 *
 * ─── Keyboard ─────────────────────────────────────────────────────────────────
 *
 *   Enter and Space are handled via the standard <button> click event —
 *   browsers fire click on Enter/Space for <button> elements by default.
 *   No custom keyDown handler is needed for these keys.
 *   When disabled, the browser suppresses all key and click events. ✓
 *
 * ─── Disabled State (P1-2 fix) ────────────────────────────────────────────────
 *
 *   `disabled` is set to true when isSubmitting=true in the player state.
 *   HTML <button disabled> suppresses click, keydown, and pointer events natively.
 *   A subtle opacity and cursor change signals the locked state visually.
 *
 * ─── Accessibility ────────────────────────────────────────────────────────────
 *
 *   aria-pressed={isSelected}  — announces "pressed" or "not pressed"
 *   aria-label                 — full readable label: "Option A: {body}"
 *   disabled                   — announced as "dimmed" / unavailable
 *   focus-visible:ring         — keyboard focus indicator
 *   The decorative label badge (A/B/C/D) is aria-hidden since aria-label
 *   already includes the letter.
 */

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { QuestionOption } from '../types';

interface OptionTileProps {
  /**
   * The option data — QuestionOption has NO is_correct field.
   * That field is absent from the type definition (Phase 0) and cannot
   * be added without modifying the anti-cheat type contract.
   */
  option: QuestionOption;
  /**
   * Whether this option is currently selected by the student.
   * This is student SELECTION state, never correctness state.
   * Source: LocalAnswer.selectedOptionId === option.id
   */
  isSelected: boolean;
  /** Called with optionId when the student taps/clicks/keyboard-activates */
  onSelect: (optionId: string) => void;
  /**
   * When true, the button is disabled (HTML native disabled attribute).
   * Set during submit flow (isSubmitting=true) to prevent double-selection.
   * P1-2 fix: was missing entirely before stabilization sprint.
   */
  disabled?: boolean;
}

export function OptionTile({ option, isSelected, onSelect, disabled = false }: OptionTileProps) {
  const t = useTranslations('player');

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={t('aria_option_label', { label: option.label, body: option.body })}
      onClick={() => onSelect(option.id)}
      disabled={disabled}
      className={cn(
        // Layout: full-row button, min 52px height for touch target (WCAG 2.5.5)
        'relative w-full min-h-[52px] flex items-center gap-3 px-4 py-3',
        'rounded-lg border-2 text-left',
        // Smooth color transitions (≤100ms so there is no animation lag on tap)
        'transition-colors duration-100',
        // Focus ring — visible only for keyboard navigation (focus-visible)
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        // ── Selected state ────────────────────────────────────────────────────
        // Indigo: the player's selection colour (not a correctness signal).
        // No green, no red, no amber — only selected/unselected.
        isSelected
          ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50',
        // ── Disabled state (submit in flight) ─────────────────────────────────
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* Label badge (A / B / C / D) — decorative, hidden from assistive tech */}
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 flex items-center justify-center w-7 h-7 rounded-full',
          'text-xs font-bold',
          isSelected
            ? 'bg-indigo-500 text-white'
            : 'bg-slate-100 text-slate-600',
        )}
      >
        {option.label}
      </span>

      {/* Option text — multilingual (same font cascade as QuestionStem) */}
      <span
        className="flex-1 text-sm md:text-base leading-relaxed"
        style={{
          fontFamily:
            'var(--font-sans), var(--font-bengali), var(--font-devanagari), sans-serif',
        }}
      >
        {option.body}
      </span>
    </button>
  );
}
