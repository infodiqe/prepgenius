'use client';

/**
 * Mock Player — OptionList
 *
 * Renders the four answer options for the current question.
 *
 * ─── Option Data Flow ─────────────────────────────────────────────────────────
 *
 *   QuestionSlot.options: QuestionOption[]
 *       │
 *       │  QuestionOption = { id, label, body, position }
 *       │  NO is_correct field — structurally impossible per Phase 0 types
 *       │
 *       ▼
 *   OptionList
 *       │
 *       │  Determines selection: option.id === selectedOptionId
 *       │  Selection state is from LocalAnswer.selectedOptionId, NOT correctness
 *       │
 *       │  Dispatches on tile click:
 *       │    SELECT_OPTION { questionId, optionId }
 *       │  Then immediately saves via useSaveAnswer (write-through + retry)
 *       │
 *       ▼
 *   OptionTile × 4
 *       Props: { option, isSelected, onSelect, disabled }
 *       NO correctness props — the OptionTile type has no channel for them
 *
 * ─── Anti-Cheat ───────────────────────────────────────────────────────────────
 *
 *   `isSelected` is `boolean` — it means "did the student pick this option?"
 *   It has zero semantic relation to correctness. It is computed from:
 *     selectedOptionId (from LocalAnswer — architecture §3.3)
 *   which is set by SELECT_OPTION dispatch, never by any correctness signal.
 *
 *   OptionList never reads, receives, or forwards is_correct or explanation.
 *   Passing such values would require adding them to QuestionOption (a Phase 0
 *   type contract violation) — a compile error, not just a runtime invariant.
 */

import { useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { usePlayerState } from '../hooks/usePlayerState';
import { useSaveAnswer } from '../hooks/useSaveAnswer';
import { OptionTile } from './OptionTile';
import type { QuestionOption, QuestionState } from '../types';

interface OptionListProps {
  questionId: string;
  /** QuestionOption[] — no is_correct field (enforced by QuestionOption type) */
  options: QuestionOption[];
  /** Currently selected option ID, or null if not answered / cleared */
  selectedOptionId: string | null;
}

export function OptionList({
  questionId,
  options,
  selectedOptionId,
}: OptionListProps) {
  const { state, dispatch } = usePlayerState();
  const { saveAnswer } = useSaveAnswer();
  const t = useTranslations('player');

  // Ref so handleSelect can read the latest answers without being recreated
  // on every answer-map change (which happens on every SELECT_OPTION dispatch).
  const answersRef = useRef(state.answers);
  answersRef.current = state.answers;

  const handleSelect = useCallback(
    (optionId: string) => {
      const existing = answersRef.current.get(questionId);

      // Mirror the reducer transition (architecture §4.3) to compute the new
      // state before dispatching — needed for the save payload.
      // marked + select → answered_marked; anything else → answered
      const newAnswerState: QuestionState =
        existing?.state === 'marked' ? 'answered_marked' : 'answered';

      // ── Step 1: optimistic local update via reducer ─────────────────────────
      dispatch({ type: 'SELECT_OPTION', payload: { questionId, optionId } });

      // ── Step 2: persist to server + IDB (write-through, retry, offline queue)
      // P0-1 FIX: saveAnswer must be called here; the reducer dispatch alone
      // only updates React state and never touches the network or IndexedDB.
      void saveAnswer(
        questionId,
        optionId,
        newAnswerState,
        existing?.timeSpentSeconds ?? 0,
      );
    },
    [dispatch, saveAnswer, questionId],
  );

  // Render in position order (defensive sort; server should already order them)
  const sorted = [...options].sort((a, b) => a.position - b.position);

  return (
    <div
      className="space-y-3"
      role="group"
      aria-label={t('aria_answer_options')}
    >
      {sorted.map((option) => (
        <OptionTile
          key={option.id}
          option={option}
          isSelected={option.id === selectedOptionId}
          onSelect={handleSelect}
          // P1-2 FIX: disable interactions while submission is in flight
          disabled={state.isSubmitting}
        />
      ))}
    </div>
  );
}
