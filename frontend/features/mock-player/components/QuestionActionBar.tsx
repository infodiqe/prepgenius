'use client';

/**
 * Mock Player — QuestionActionBar
 *
 * Provides control buttons for sequentially navigating questions (Prev / Next)
 * and modifying answer state (Mark for Review / Clear Response).
 *
 * ─── Layout Specifications (architecture §10.2, §10.3) ───────────────────────
 *
 *   Desktop (lg+, >= 1024px):
 *     Row of actions below the QuestionPanel:
 *     [ ‹ Prev ]   [ ⚑ Mark for Review ]   [ Clear Response ]   [ Save & Next › ]
 *     (with "Save & Next" changing to "Review & Submit" on the last question).
 *
 *   Mobile (< lg, < 1024px):
 *     Compact double-row sticky layout:
 *     Row 1: [ Prev ] [ Mark ] [ Next ]
 *     Row 2: [ Clear ] [ ⊞ Palette Trigger (with progress count) ]
 *
 * ─── Navigation visited-state integration ────────────────────────────────────
 *
 *   To guarantee 100% parity with QuestionPalette navigation:
 *     1. Reads destination question answer state before dispatch.
 *     2. Dispatches NAVIGATE_TO to trigger React State transitions.
 *     3. Calls saveAnswer(destId, null, 'visited', timeSpent) if the destination
 *        was not_visited before.
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Bookmark, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';
import { usePlayerNavigation } from '../hooks/usePlayerNavigation';
import { useSaveAnswer } from '../hooks/useSaveAnswer';
import type { QuestionState } from '../types';

export function QuestionActionBar() {
  const { state, dispatch } = usePlayerState();
  const { navigateTo } = usePlayerNavigation();
  const { saveAnswer } = useSaveAnswer();
  const t = useTranslations('player');

  const { currentIndex, questionCount, questions, answers, isSubmitting } = state;

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;
  const isLastQuestion = currentIndex === questionCount - 1;

  // Disabled states
  const isPrevDisabled = currentIndex === 0 || isSubmitting;
  const isNextDisabled = isSubmitting;
  const isClearDisabled =
    !currentAnswer ||
    (currentAnswer.state !== 'answered' && currentAnswer.state !== 'answered_marked') ||
    isSubmitting;

  const isMarked =
    currentAnswer?.state === 'marked' || currentAnswer?.state === 'answered_marked';

  // ── Action: Navigate ───────────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (targetIndex: number) => {
      void navigateTo(targetIndex);
    },
    [navigateTo],
  );

  // ── Action: Toggle Mark ────────────────────────────────────────────────────
  const handleToggleMark = useCallback(() => {
    if (!currentQuestion || isSubmitting) return;

    const qId = currentQuestion.id;
    const existing = answers.get(qId);
    const currentState = existing?.state ?? 'not_visited';

    const stateAfterToggle: QuestionState = (
      {
        answered: 'answered_marked',
        answered_marked: 'answered',
        visited: 'marked',
        marked: 'visited',
        not_visited: 'marked',
      } as Record<QuestionState, QuestionState>
    )[currentState];

    dispatch({ type: 'TOGGLE_MARK', payload: { questionId: qId } });
    void saveAnswer(
      qId,
      existing?.selectedOptionId ?? null,
      stateAfterToggle,
      existing?.timeSpentSeconds ?? 0,
    );
  }, [currentQuestion, answers, isSubmitting, dispatch, saveAnswer]);

  // ── Action: Clear Response ─────────────────────────────────────────────────
  const handleClearResponse = useCallback(() => {
    if (!currentQuestion || isClearDisabled) return;

    const qId = currentQuestion.id;
    const existing = answers.get(qId);
    if (!existing) return;

    const newState: QuestionState =
      existing.state === 'answered' ? 'visited' : 'marked';

    dispatch({ type: 'CLEAR_RESPONSE', payload: { questionId: qId } });
    void saveAnswer(qId, null, newState, existing.timeSpentSeconds);
  }, [currentQuestion, answers, isClearDisabled, dispatch, saveAnswer]);

  // ── Action: Next / Submit ──────────────────────────────────────────────────
  const handleNextClick = useCallback(() => {
    if (isLastQuestion) {
      dispatch({ type: 'OPEN_SUBMIT' });
    } else {
      handleNavigate(currentIndex + 1);
    }
  }, [isLastQuestion, currentIndex, handleNavigate, dispatch]);

  if (!currentQuestion) return null;

  return (
    <div
      className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:h-16 lg:py-0"
      role="group"
      aria-label={t('aria_question_controls')}
    >
      {/* ── Desktop Layout (lg+) ── */}
      <div className="hidden lg:flex items-center justify-between w-full max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => handleNavigate(currentIndex - 1)}
          disabled={isPrevDisabled}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200',
            'transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            isPrevDisabled
              ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
              : 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
          )}
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          {t('action_previous')}
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleMark}
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isMarked
                ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
              isSubmitting && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Bookmark className="w-4 h-4" aria-hidden="true" />
            {isMarked ? t('action_marked') : t('action_mark_review')}
          </button>

          <button
            type="button"
            onClick={handleClearResponse}
            disabled={isClearDisabled}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isClearDisabled
                ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-red-600',
            )}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {t('action_clear_response')}
          </button>
        </div>

        <button
          type="button"
          onClick={handleNextClick}
          disabled={isNextDisabled}
          className={cn(
            'flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500',
            isNextDisabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : isLastQuestion
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700',
          )}
        >
          {isLastQuestion ? t('action_review_submit') : t('action_save_next')}
          {!isLastQuestion && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {/* ── Mobile Layout (<lg) ── */}
      <div className="lg:hidden flex flex-col gap-2 w-full">
        {/* Row 1: Navigation + Mark */}
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={() => handleNavigate(currentIndex - 1)}
            disabled={isPrevDisabled}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 h-11 px-3 text-sm font-semibold rounded-lg border border-slate-200',
              isPrevDisabled
                ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                : 'bg-white text-slate-700 active:bg-slate-100',
            )}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {t('action_prev_short')}
          </button>

          <button
            type="button"
            onClick={handleToggleMark}
            disabled={isSubmitting}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 h-11 px-3 text-sm font-semibold rounded-lg border transition-colors duration-100',
              isMarked
                ? 'bg-violet-50 border-violet-200 text-violet-700'
                : 'bg-white border-slate-200 text-slate-700',
              isSubmitting && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Bookmark className="w-4 h-4" aria-hidden="true" />
            {isMarked ? t('action_marked') : t('action_mark_short')}
          </button>

          <button
            type="button"
            onClick={handleNextClick}
            disabled={isNextDisabled}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 h-11 px-3 text-sm font-semibold rounded-lg transition-colors duration-100',
              isNextDisabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white active:bg-indigo-700',
            )}
          >
            {isLastQuestion ? t('action_submit_short') : t('action_next_short')}
            {!isLastQuestion && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>

        {/* Row 2: Clear + Mobile Palette Trigger */}
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={handleClearResponse}
            disabled={isClearDisabled}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-semibold rounded-lg border transition-colors duration-100',
              isClearDisabled
                ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-600 active:bg-slate-50 active:text-red-600',
            )}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            {t('action_clear_response')}
          </button>

          {/* Mobile palette trigger */}
          <button
            type="button"
            onClick={() => dispatch({ type: 'OPEN_PALETTE' })}
            aria-label={t('open_navigator')}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 active:bg-slate-50"
          >
            <span aria-hidden="true">⊞</span>
            <span>{currentIndex + 1}/{questionCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
