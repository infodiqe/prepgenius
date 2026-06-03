'use client';

/**
 * Mock Player — QuestionPanel
 *
 * Root component for the question display area. Reads the current question
 * and answer state from PlayerContext and renders the three sub-components.
 *
 * ─── Question Rendering Flow ──────────────────────────────────────────────────
 *
 *   PlayerContext
 *     state.questions[state.currentIndex]   → QuestionSlot (no is_correct)
 *     state.answers.get(questionId)         → LocalAnswer  (no is_correct)
 *     state.currentIndex / state.questionCount
 *         │
 *         ▼
 *   QuestionPanel (scroll container; resets scroll on index change)
 *     │
 *     ├── QuestionHeader
 *     │     currentIndex, questionCount, section
 *     │
 *     ├── QuestionStem
 *     │     stem  (plain text; multilingual)
 *     │
 *     └── OptionList
 *           questionId, options[], selectedOptionId
 *           (options[] has NO is_correct — enforced by QuestionOption type)
 *
 * ─── Anti-Cheat ───────────────────────────────────────────────────────────────
 *
 *   All data originates from QuestionSlot (Phase 0 type). QuestionSlot does
 *   not contain is_correct or explanation — TypeScript enforces this. No value
 *   from this component or its children can ever expose correctness data.
 *   See architecture §18.2 and Phase 0 type definitions.
 */

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePlayerState } from '../hooks/usePlayerState';
import { QuestionHeader } from './QuestionHeader';
import { QuestionStem } from './QuestionStem';
import { OptionList } from './OptionList';

export function QuestionPanel() {
  const { state } = usePlayerState();
  const t = useTranslations('player');
  const scrollRef = useRef<HTMLDivElement>(null);

  const question = state.questions[state.currentIndex];
  const localAnswer = question ? state.answers.get(question.id) : undefined;

  // Reset scroll to top whenever the question changes.
  // 'instant' avoids the jarring animation when navigating quickly.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [state.currentIndex]);

  // Guard: render nothing if session is not yet hydrated
  if (!question) return null;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      role="region"
      aria-label={t('progress_panel_label', { index: state.currentIndex + 1, total: state.questionCount })}
    >
      {/* Max-width prose container centred within the panel */}
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto space-y-6">
        <QuestionHeader
          currentIndex={state.currentIndex}
          questionCount={state.questionCount}
          section={question.section}
        />

        <QuestionStem stem={question.stem} />

        <OptionList
          questionId={question.id}
          options={question.options}
          selectedOptionId={localAnswer?.selectedOptionId ?? null}
        />
      </div>
    </div>
  );
}
