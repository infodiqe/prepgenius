"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import type { Theme } from "@/lib/theme/cookies";
import { buildThemeCookie, nextTheme } from "@/lib/theme/themeActions";

/**
 * Theme context + provider — Sprint 0 · S0-T06.
 *
 * Seeded from the SSR-resolved theme (S0-T01 `getThemeServer()` → S0-T05 `<html>`
 * class), so the initial client state matches the server-rendered class.
 *
 * Hydration safety: the provider does **not** mutate the DOM on mount — the SSR
 * class is already correct — so there is no flash and no hydration mismatch.
 * `suppressHydrationWarning` is therefore not required (the class is only mutated
 * imperatively in response to a user toggle, after hydration).
 *
 * The cookie name is injected via `cookieName` (sourced from the single
 * `THEME_COOKIE` constant by the server layout) so this client module never
 * imports the server-only `next/headers` infrastructure.
 */

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  initialTheme,
  cookieName,
  children,
}: {
  initialTheme: Theme;
  cookieName: string;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback(
    (next: Theme) => {
      // Persist (1-year, Lax) and apply the class imperatively — no reload.
      document.cookie = buildThemeCookie(cookieName, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      setThemeState(next);
    },
    [cookieName],
  );

  const toggleTheme = useCallback(
    () => setTheme(nextTheme(theme)),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
