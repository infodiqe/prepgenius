'use client';

/**
 * Mock Player — Loading Skeleton
 *
 * Full-viewport skeleton displayed while the player shell initialises:
 *   - Questions loading from TanStack Query
 *   - IndexedDB opening and session reading
 *   - startAttempt() in flight (for 'created' attempts)
 *
 * Matches the player layout at both mobile and desktop breakpoints.
 * Uses pure CSS animation (no JS interval) to keep the bundle lean.
 */

import { useTranslations } from 'next-intl';

export function PlayerLoadingSkeleton() {
  const t = useTranslations('player');

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-white"
      aria-busy="true"
      aria-label={t('aria_loading_session')}
    >
      {/* ── Top bar skeleton ───────────────────────────────────────────────── */}
      <div className="h-14 shrink-0 border-b border-slate-100 bg-white flex items-center px-4 gap-4">
        {/* Exit button */}
        <div className="h-8 w-16 rounded-md bg-slate-100 animate-pulse" />

        {/* Section tabs */}
        <div className="hidden sm:flex gap-2 flex-1">
          <div className="h-7 w-16 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-7 w-20 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-7 w-18 rounded-full bg-slate-100 animate-pulse" />
        </div>

        {/* Timer + save + submit */}
        <div className="ml-auto flex items-center gap-3">
          <div className="h-7 w-20 rounded-md bg-slate-100 animate-pulse" />
          <div className="h-6 w-16 rounded-md bg-slate-100 animate-pulse" />
          <div className="h-8 w-20 rounded-md bg-indigo-100 animate-pulse" />
        </div>
      </div>

      {/* ── Content area ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8 space-y-6">
            {/* Question header */}
            <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />

            {/* Question stem — 3 lines */}
            <div className="space-y-3 pt-2">
              <div className="h-5 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-5 w-11/12 rounded bg-slate-100 animate-pulse" />
              <div className="h-5 w-3/4 rounded bg-slate-100 animate-pulse" />
            </div>

            {/* Options — 4 tiles */}
            <div className="space-y-3 pt-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 w-full rounded-lg border border-slate-100 bg-slate-50 animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div className="h-14 shrink-0 border-t border-slate-100 bg-white flex items-center justify-between px-4">
            <div className="h-9 w-20 rounded-md bg-slate-100 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-28 rounded-md bg-slate-100 animate-pulse" />
              <div className="h-9 w-24 rounded-md bg-indigo-100 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Desktop palette panel (lg+) */}
        <div className="hidden lg:flex lg:w-72 shrink-0 border-l border-slate-100 flex-col p-4 gap-3">
          {/* Summary row */}
          <div className="h-8 w-full rounded-md bg-slate-100 animate-pulse" />

          {/* Palette grid */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-10 rounded-md bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
