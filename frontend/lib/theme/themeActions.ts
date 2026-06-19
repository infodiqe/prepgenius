import type { Theme } from "./cookies";

/**
 * Client-safe theme actions — Sprint 0 · S0-T06.
 *
 * Pure helpers used by the (client) `ThemeProvider`. This module imports only the
 * `Theme` *type* from `lib/theme/cookies` (erased at compile time), so it never
 * pulls the server-only `next/headers` dependency into the client bundle.
 */

/** One year in seconds — theme cookie lifetime (matches the cookie registry). */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The opposite theme — used by the toggle. */
export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/**
 * Build the client-set theme cookie string (root path, `SameSite=Lax`, 1-year),
 * consistent with the locale cookie pattern and the cookie registry (S0-T01).
 * The `name` is injected from the single source (`THEME_COOKIE`) by the caller.
 */
export function buildThemeCookie(name: string, theme: Theme): string {
  return `${name}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}
