'use client';

/**
 * Mock Player — QuestionPalette
 *
 * The Question Navigator. Shows all questions as colour-coded tiles so the
 * student can see progress at a glance and jump to any question.
 *
 * ─── Desktop Layout (lg+, 1024px+) ────────────────────────────────────────────
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  ... ExamTopBar ...                                         │
 *   ├────────────────────────────────┬────────────────────────────┤
 *   │                                │  QUESTION PALETTE          │
 *   │  QUESTION AREA                 │  ─────────────────────     │
 *   │  (flex-1)                      │  PaletteSummary            │
 *   │                                │  PaletteLegend             │
 *   │                                │  ─────────────────────     │
 *   │                                │  SectionGroup (CDP)        │
 *   │                                │    ① ② ③ ④ ⑤              │
 *   │                                │    ⑥ ⑦ ⑧                  │
 *   │                                │  SectionGroup (Science)    │
 *   │                                │    ...                     │
 *   │                                │  ─────────────────────     │
 *   │                                │  [Jump to unanswered]      │
 *   └────────────────────────────────┴────────────────────────────┘
 *
 *   Width: 280px (w-70 = 17.5rem)
 *   Always visible — no open/close toggle on desktop.
 *
 * ─── Mobile Layout (<lg, <1024px) ─────────────────────────────────────────────
 *
 *   The palette slides up as a bottom sheet (70vh max-height).
 *   Opened by a trigger button in the action bar area.
 *   IMPORTANT: backdrop tap does NOT close the sheet (architecture §14.3).
 *   The student must use the explicit "×  Close" button.
 *
 *   ┌──────────────────────────────────┐
 *   │  ── Question Navigator ────────  │
 *   │                           [✕]   │
 *   │  PaletteSummary                  │
 *   │  PaletteLegend                   │
 *   │  SectionGroup ...                │
 *   │  [Jump to unanswered]            │
 *   └──────────────────────────────────┘  ← slide up from bottom
 *
 * ─── QA Fix: Destination Visited State ─────────────────────────────────────────
 *
 *   When a tile is clicked, handleNavigate:
 *     1. Reads current answer state for the destination BEFORE dispatching
 *     2. Dispatches NAVIGATE_TO (reducer marks both from + dest as visited)
 *     3. Dispatches CLOSE_PALETTE (harmless no-op on desktop)
 *     4. If dest was not_visited: calls saveAnswer('visited') to persist to server
 *
 *   This ensures the destination is never left in not_visited while being viewed,
 *   and the visited state reaches the server.
 */

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';
import { usePlayerNavigation } from '../hooks/usePlayerNavigation';
import { PaletteSummary } from './PaletteSummary';
import { PaletteLegend } from './PaletteLegend';
import { SectionGroup } from './SectionGroup';
import type { SectionGroupItem } from './SectionGroup';
import type { QuestionSlot } from '../types';

// ─── Section grouping ─────────────────────────────────────────────────────────

interface GroupedSection {
  label: string | null;
  items: SectionGroupItem[];
}

/**
 * Groups questions into sections preserving original order.
 * Questions with section=null all fall into a single unnamed group.
 */
function groupQuestionsBySections(questions: QuestionSlot[]): GroupedSection[] {
  const groupMap = new Map<string, GroupedSection>();
  const NULL_KEY = '\0null'; // sentinel for null section

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const key = q.section ?? NULL_KEY;

    if (!groupMap.has(key)) {
      groupMap.set(key, { label: q.section, items: [] });
    }
    groupMap.get(key)!.items.push({ slot: q, globalIndex: i });
  }

  return [...groupMap.values()];
}

// ─── Palette content (shared between desktop panel and mobile sheet) ───────────

interface PaletteContentsProps {
  onNavigate: (globalIndex: number) => void;
  onJumpToUnanswered: () => void;
}

function PaletteContents({ onNavigate, onJumpToUnanswered }: PaletteContentsProps) {
  const { state } = usePlayerState();
  const t = useTranslations('player');

  const sections = useMemo(
    () => groupQuestionsBySections(state.questions),
    [state.questions],
  );

  return (
    <>
      {/* Live answer counts */}
      <PaletteSummary />

      {/* State legend */}
      <div className="border-y border-slate-100">
        <PaletteLegend />
      </div>

      {/* Question tile grid (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <SectionGroup
            key={section.label ?? '__unsectioned__'}
            sectionLabel={section.label}
            items={section.items}
            answers={state.answers}
            currentIndex={state.currentIndex}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* Jump to first unanswered */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onJumpToUnanswered}
          className={cn(
            'w-full py-2 px-3 text-sm font-medium rounded-lg',
            'text-indigo-600 bg-indigo-50 hover:bg-indigo-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            'transition-colors duration-100',
          )}
        >
          {t('jump_unanswered')}
        </button>
      </div>
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function QuestionPalette() {
  const { state, dispatch } = usePlayerState();
  const { navigateTo } = usePlayerNavigation();
  const t = useTranslations('player');

  // ── Navigation handler ────────────────────────────────────────────────────────

  const handleNavigate = useCallback(
    (globalIndex: number) => {
      void navigateTo(globalIndex);
    },
    [navigateTo],
  );

  // ── Jump to first unanswered ─────────────────────────────────────────────────

  const handleJumpToUnanswered = useCallback(() => {
    const idx = state.questions.findIndex((q) => {
      const ans = state.answers.get(q.id);
      return !ans || ans.state === 'not_visited' || ans.state === 'visited';
    });
    if (idx !== -1) handleNavigate(idx);
  }, [state.questions, state.answers, handleNavigate]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Desktop panel (lg+): always visible, fixed 280px ─────────────── */}
      <aside
        className="hidden lg:flex flex-col w-[280px] shrink-0 h-full border-l border-slate-200 bg-white overflow-hidden"
        aria-label={t('navigator_title')}
      >
        <PaletteContents
          onNavigate={handleNavigate}
          onJumpToUnanswered={handleJumpToUnanswered}
        />
      </aside>

      {/* ── Mobile sheet (<lg): CSS bottom-sheet ──────────────────────────── */}
      <div className="lg:hidden">
        {/* Overlay — purely visual; backdrop tap does NOT close (architecture §14.3) */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/20',
            'transition-opacity duration-300',
            state.paletteOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none',
          )}
          aria-hidden="true"
        />

        {/* Sheet */}
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'flex flex-col bg-white rounded-t-2xl shadow-xl',
            'transition-transform duration-300 ease-out',
            state.paletteOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none',
          )}
          style={{ maxHeight: '70vh' }}
          role="dialog"
          aria-modal="true"
          aria-label={t('navigator_title')}
        >
          {/* Sheet header with title + close button */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">
              {t('navigator_title')}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CLOSE_PALETTE' })}
              aria-label={t('close_navigator')}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full',
                'text-slate-500 hover:bg-slate-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              )}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable sheet contents */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <PaletteContents
              onNavigate={handleNavigate}
              onJumpToUnanswered={handleJumpToUnanswered}
            />
          </div>
        </div>
      </div>
    </>
  );
}
