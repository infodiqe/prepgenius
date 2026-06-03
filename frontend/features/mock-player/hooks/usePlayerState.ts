'use client';

/**
 * Mock Player — usePlayerState hook
 *
 * Typed context accessor. Throws a clear error if called outside <PlayerProvider>
 * so developers get an actionable message rather than a null-access crash.
 *
 * Usage:
 *   const { state, dispatch } = usePlayerState();
 */

import { useContext } from 'react';
import { PlayerContext } from '../PlayerContext';
import type { PlayerContextValue } from '../PlayerContext';

export function usePlayerState(): PlayerContextValue {
  const ctx = useContext(PlayerContext);

  if (ctx === null) {
    throw new Error(
      'usePlayerState() must be called inside <PlayerProvider>. ' +
        'Wrap your component tree with <PlayerProvider> in MockPlayerShell.',
    );
  }

  return ctx;
}
