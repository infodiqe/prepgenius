'use client';

/**
 * Mock Player — OfflineBanner
 *
 * Renders a full-width alert banner at the bottom of the viewport when
 * the save status is 'queued'. Reminds the student that they are offline
 * but their progress is preserved locally.
 */

import { useTranslations } from 'next-intl';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerState } from '../hooks/usePlayerState';

export function OfflineBanner() {
  const { state } = usePlayerState();
  const t = useTranslations('player');

  const isQueued = state.saveStatus === 'queued';

  if (!isQueued) return null;

  return (
    <div
      role="alert"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-amber-500 text-white',
        'flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold shadow-lg md:text-sm',
      )}
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{t('offline_banner_text')}</span>
    </div>
  );
}
