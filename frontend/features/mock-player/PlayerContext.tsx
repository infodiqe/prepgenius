'use client';

/**
 * Mock Player — React Context
 *
 * Provides PlayerState and dispatch to the entire player component tree.
 * The context is null by default; usePlayerState() throws a descriptive
 * error if consumed outside <PlayerProvider>.
 *
 * Architecture: one useReducer at the top of the player tree (in
 * MockPlayerShell), shared downward via context. No prop drilling needed.
 */

import { createContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';

import { playerReducer, initialPlayerState } from './playerReducer';
import type { PlayerState, PlayerAction } from './types';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface PlayerContextValue {
  state: PlayerState;
  dispatch: Dispatch<PlayerAction>;
}

/**
 * The raw context object.
 * Exported so hooks (usePlayerState) can call useContext() on it directly.
 * Null default enforces that it must be used inside <PlayerProvider>.
 */
export const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface PlayerProviderProps {
  children: ReactNode;
}

/**
 * Wraps the mock player component tree and provides state + dispatch.
 * Must be placed in a Client Component (it uses useReducer).
 * Typically rendered in MockPlayerShell.tsx.
 */
export function PlayerProvider({ children }: PlayerProviderProps) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);

  return (
    <PlayerContext.Provider value={{ state, dispatch }}>
      {children}
    </PlayerContext.Provider>
  );
}
