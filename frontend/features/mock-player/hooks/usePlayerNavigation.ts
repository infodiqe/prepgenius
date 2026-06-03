'use client';

/**
 * Mock Player — usePlayerNavigation hook
 *
 * Centralizes the navigation sequence to prevent code duplication
 * across the QuestionPalette, QuestionActionBar, and SectionTabRow.
 *
 * ─── Navigation Sequence ──────────────────────────────────────────────────────
 *
 *   1. Validate target index bounds.
 *   2. Read destination question and its current answer state.
 *   3. Dispatch NAVIGATE_TO to transition React UI states.
 *   4. Dispatch CLOSE_PALETTE to close the navigator drawer on mobile.
 *   5. If destination question was not_visited, trigger saveAnswer('visited').
 */

import { useCallback } from 'react';
import { usePlayerState } from './usePlayerState';
import { useSaveAnswer } from './useSaveAnswer';

export function usePlayerNavigation() {
  const { state, dispatch } = usePlayerState();
  const { saveAnswer } = useSaveAnswer();

  const { questions, answers, questionCount } = state;

  const navigateTo = useCallback(
    async (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= questionCount) return;

      const destQuestion = questions[targetIndex];
      if (!destQuestion) return;

      const destAnswer = answers.get(destQuestion.id);
      const destWasNotVisited = !destAnswer || destAnswer.state === 'not_visited';

      // 1. Trigger reducer state transition
      dispatch({ type: 'NAVIGATE_TO', payload: { index: targetIndex } });

      // 2. Close mobile palette sheet if open
      dispatch({ type: 'CLOSE_PALETTE' });

      // 3. Save visited state for previously unseen questions
      if (destWasNotVisited) {
        void saveAnswer(
          destQuestion.id,
          null,
          'visited',
          destAnswer?.timeSpentSeconds ?? 0,
        );
      }
    },
    [questions, answers, questionCount, dispatch, saveAnswer],
  );

  return { navigateTo };
}
