'use client';

/**
 * Mock Player — ExamTopBar
 *
 * Sticky header component for the mock player (56px high on desktop, 48px on mobile).
 * Hosts:
 *   - Left: Exit button and attempt type context label.
 *   - Center: SectionTabRow for switching sections in multi-section mock tests.
 *   - Right: Auto-save status indicator, countdown timer, and submit test action.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';
import { SaveStatus } from './SaveStatus';
import { Timer } from './Timer';
import { SubmitButton } from './SubmitButton';
import { SectionTabRow } from './SectionTabRow';
import { ExitDialog } from './ExitDialog';

export function ExamTopBar() {
  const { state } = usePlayerState();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('player');

  const { attemptType } = state;

  const handleExitConfirm = () => {
    setIsExitDialogOpen(false);
    // Redirect back to practice dashboard/hub.
    // Local progress is saved in IndexedDB and can be resumed from the hub.
    router.push('/practice');
  };

  const getTitle = () => {
    switch (attemptType) {
      case 'full_mock':
        return t('title_mock_test');
      case 'previous_year':
        return t('title_pyp');
      default:
        return t('title_practice');
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 w-full h-12 lg:h-14 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-3 lg:px-4 flex items-center justify-between"
        role="banner"
      >
        {/* Left: Exit Action + Exam Context */}
        <div className="flex items-center gap-1.5 lg:gap-2">
          <button
            type="button"
            onClick={() => setIsExitDialogOpen(true)}
            aria-label={t('aria_exit_test')}
            className={cn(
              'flex items-center justify-center gap-1 h-8 lg:h-9 px-2 lg:px-3 rounded-lg border border-slate-200 text-slate-600',
              'hover:bg-slate-50 active:bg-slate-100 transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4" aria-hidden="true" />
            <span className="hidden sm:inline font-semibold text-xs">
              {t('exit_button')}
            </span>
          </button>
          <span className="text-xs lg:text-sm font-bold text-slate-800 tracking-tight hidden md:inline border-l border-slate-200 pl-3">
            {getTitle()}
          </span>
        </div>

        {/* Center: Section tabs pills (hidden if practice or single-section) */}
        <SectionTabRow />

        {/* Right: Save Indicator + Countdown + Submit Button */}
        <div className="flex items-center gap-2 lg:gap-3">
          <SaveStatus />
          <Timer />
          <SubmitButton />
        </div>
      </header>

      {/* Exit confirmation dialogue */}
      <ExitDialog
        isOpen={isExitDialogOpen}
        onOpenChange={setIsExitDialogOpen}
        onConfirm={handleExitConfirm}
      />
    </>
  );
}
