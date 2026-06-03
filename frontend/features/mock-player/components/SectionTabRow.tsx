'use client';

/**
 * Mock Player — SectionTabRow
 *
 * Renders the section tabs (e.g. "CDP", "Science", "English") in the ExamTopBar.
 *
 * ─── Specifications & Rules ──────────────────────────────────────────────────
 *
 *   1. Displays unique sections computed dynamically from state.questions.
 *   2. Highlights the section tab matching the current question's section.
 *   3. Tapping a tab jumps the student to the first question in that section.
 *   4. Navigating via tabs uses identical visited-state saving rules as the palette:
 *        - Check if destination was not_visited BEFORE dispatch.
 *        - Dispatch NAVIGATE_TO to update reducer state.
 *        - Call saveAnswer(destId, null, 'visited', timeSpent) if unseen.
 *   5. Hides itself completely if:
 *        - There is only 1 section or no sections are defined.
 *        - The attempt type is a practice mode ('topic', 'subject', 'mixed', 'daily').
 */

import { useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';
import { usePlayerNavigation } from '../hooks/usePlayerNavigation';

export function SectionTabRow() {
  const { state } = usePlayerState();
  const { navigateTo } = usePlayerNavigation();
  const t = useTranslations('player');

  const { questions, currentIndex, attemptType } = state;

  // ── 1. Hide tabs if it's a practice mode ──
  const isPracticeMode =
    attemptType === 'topic' ||
    attemptType === 'subject' ||
    attemptType === 'mixed' ||
    attemptType === 'daily';

  // ── 2. Compute unique sections dynamically using Set (O(n) linear check) ──
  const sections = useMemo(() => {
    if (isPracticeMode) return [];
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.section) {
        set.add(q.section);
      }
    });
    return Array.from(set);
  }, [questions, isPracticeMode]);

  // ── 3. Map unique sections to their first question index ──
  const sectionFirstIndices = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q, idx) => {
      if (q.section && !map.has(q.section)) {
        map.set(q.section, idx);
      }
    });
    return map;
  }, [questions]);

  // Determine active section from the current question
  const currentQuestion = questions[currentIndex];
  const activeSection = currentQuestion?.section;

  // Navigation handler
  const handleSectionClick = useCallback(
    (sectionName: string) => {
      const targetIdx = sectionFirstIndices.get(sectionName);
      if (targetIdx === undefined) return;
      void navigateTo(targetIdx);
    },
    [sectionFirstIndices, navigateTo],
  );

  // Hide if single section or practice attempt
  if (isPracticeMode || sections.length <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full px-2 lg:px-0"
      aria-label={t('aria_sections')}
    >
      <div className="flex border-b border-slate-100 lg:border-none gap-1 py-1">
        {sections.map((sec) => {
          const isActive = sec === activeSection;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => handleSectionClick(sec)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-100 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                isActive
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              )}
            >
              {sec}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
