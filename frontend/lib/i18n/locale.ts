// Client-safe locale constants + cookie helper (T40).
//
// This is the single source of truth for the supported locales. The next-intl
// request config (lib/i18n/request.ts) imports from here so the list is never
// duplicated, and client components can import it without pulling in the
// server-only `next/headers` dependency.
//
// Order here drives the public LanguageSwitcher display (AS | HI | EN).

export const locales = ["as", "hi", "en"] as const;
export type Locale = (typeof locales)[number];

// Assamese is the default locale (PRD v4 §4.1).
export const defaultLocale: Locale = "as";

// The cookie next-intl reads on the server to resolve the active locale.
export const LOCALE_COOKIE = "locale";

// i18n key (namespace "language") for each locale's screen-reader-friendly name.
export const LOCALE_NAME_KEY: Record<Locale, string> = {
  as: "assamese",
  hi: "hindi",
  en: "english",
};

/**
 * Persists the chosen locale using the same cookie next-intl reads on the
 * server. The 1-year max-age makes the choice survive refreshes and revisits.
 * Mirrors the existing cookie writes in the app (e.g. ProfileDetailsForm).
 */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}
