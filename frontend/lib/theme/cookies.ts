import { cookies } from "next/headers";

/**
 * Theme cookie utilities — Sprint 0 · S0-T01.
 *
 * Mirrors the locale cookie pattern in `lib/i18n/request.ts`: a validated value
 * read from the request cookie with a safe default. The approved Sprint 0 theme
 * decision sets **Light** as the default mode.
 *
 * Presentation-only: the theme never affects authorization or business logic.
 *
 * The pure `resolveTheme` helper holds all the logic so it can be unit-tested
 * without the Next.js server context; `getThemeServer` is the SSR reader that
 * delegates to it.
 */

/** Cookie name. Import this constant instead of using the string literal. */
export const THEME_COOKIE = "theme";

/** Supported themes. */
export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

/** Approved Sprint 0 default: Light mode. */
export const defaultTheme: Theme = "light";

/**
 * Pure resolver — maps a raw cookie value to a valid `Theme`, defaulting to
 * {@link defaultTheme} when the value is absent or invalid.
 */
export function resolveTheme(raw: string | undefined | null): Theme {
  return raw && (themes as readonly string[]).includes(raw)
    ? (raw as Theme)
    : defaultTheme;
}

/**
 * SSR reader — resolves the active theme from the request's `theme` cookie.
 * Returns {@link defaultTheme} when the cookie is missing or invalid.
 */
export async function getThemeServer(): Promise<Theme> {
  const cookieStore = await cookies();
  return resolveTheme(cookieStore.get(THEME_COOKIE)?.value);
}
