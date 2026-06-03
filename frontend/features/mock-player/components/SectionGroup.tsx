'use client';

/**
 * Mock Player — SectionGroup
 *
 * Renders a labelled group of QuestionTiles for one section (e.g. "CDP",
 * "Science", "English"). Used by QuestionPalette to build the navigator grid.
 *
 * ─── Grouping Strategy ────────────────────────────────────────────────────────
 *
 *   Questions are grouped by QuestionSlot.section before reaching this component.
 *   QuestionPalette performs the grouping via a useMemo that iterates state.questions
 *   in order, collecting consecutive/scattered questions with the same section label.
 *   Insertion order is preserved so sections appear in their natural exam order.
 *
 *   Multi-section exam (CTET: CDP / Science / English):
 *     SectionGroup renders a sticky header labelled with the section name.
 *
 *   Single-section / practice-type (section === null):
 *     The header is omitted entirely — the grid stands alone without a label.
 *
 * ─── Layout ──────────────────────────────────────────────────────────────────
 *
 *   5 tiles per row (grid-cols-5) with gap-1.5 spacing.
 *   Each tile: 48×48px (w-12 h-12 — exceeds WCAG 44px touch target).
 *   Panel width 280px: 5 × 48px + 4 × 6px gap = 264px content + 16px padding = 280px ✓
 *
 *   The section header is sticky (sticky top-0) so it remains visible when the
 *   user scrolls through a long section.
 */

import { QuestionTile } from './QuestionTile';
import type { QuestionSlot, LocalAnswer, QuestionState } from '../types';

export interface SectionGroupItem {
  slot: QuestionSlot;
  globalIndex: number; // 0-based index in state.questions (for NAVIGATE_TO payload)
}

interface SectionGroupProps {
  /** Section name, e.g. "CDP". Null for single-section or practice-type sessions. */
  sectionLabel: string | null;
  items: SectionGroupItem[];
  answers: Map<string, LocalAnswer>;
  currentIndex: number;
  onNavigate: (globalIndex: number) => void;
}

export function SectionGroup({
  sectionLabel,
  items,
  answers,
  currentIndex,
  onNavigate,
}: SectionGroupProps) {
  return (
    <div>
      {/* Section header — only when section is named (never rendered for null) */}
      {sectionLabel !== null && (
        <h3
          className={[
            'sticky top-0 z-10 bg-white',
            'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider',
            'text-slate-500 border-b border-slate-100',
          ].join(' ')}
        >
          {sectionLabel}
        </h3>
      )}

      {/* Tile grid: 5 columns */}
      <div className="grid grid-cols-5 gap-1.5 p-2">
        {items.map(({ slot, globalIndex }) => {
          const answer = answers.get(slot.id);
          const questionState: QuestionState = answer?.state ?? 'not_visited';

          return (
            <QuestionTile
              key={slot.id}
              position={slot.position}
              questionId={slot.id}
              questionState={questionState}
              isCurrent={globalIndex === currentIndex}
              onNavigate={() => onNavigate(globalIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
