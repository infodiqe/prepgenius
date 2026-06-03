'use client';

/**
 * Mock Player — QuestionHeader
 *
 * Displays the question position and optional section label.
 * Deliberately kept secondary and non-dominant — the stem is the focus.
 *
 * Section label:
 *   - Shown only when section is a non-empty string (e.g. "CDP", "Science")
 *   - Hidden completely (not in DOM) when section is null
 *   - Using conditional rendering rather than visibility:hidden so screen
 *     readers receive no empty announcement
 */

import { useTranslations } from 'next-intl';

interface QuestionHeaderProps {
  /** 0-based index from PlayerState.currentIndex */
  currentIndex: number;
  /** Total questions in the session (always questions.length) */
  questionCount: number;
  /** Section name, or null for single-section / practice-type attempts */
  section: string | null;
}

export function QuestionHeader({
  currentIndex,
  questionCount,
  section,
}: QuestionHeaderProps) {
  const t = useTranslations('player');

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
      <span>
        {t('progress_header_label', { index: currentIndex + 1, total: questionCount })}
      </span>

      {section !== null && (
        <>
          {/* Separator dot */}
          <span aria-hidden="true">·</span>
          <span>{section}</span>
        </>
      )}
    </div>
  );
}
