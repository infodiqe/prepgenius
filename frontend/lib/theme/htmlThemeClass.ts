import type { Theme } from "./cookies";

/**
 * Maps a resolved {@link Theme} to the class applied to the root `<html>` element
 * — Sprint 0 · S0-T05.
 *
 * **Light is the default and carries NO class** (it is the `:root` cascade in
 * `globals.css`); only dark mode adds the `dark` class. The root layout calls
 * this with the SSR-resolved value from `getThemeServer()` (S0-T01) so the
 * correct class is present in the *initial* server-rendered HTML — preventing a
 * flash of the wrong theme.
 *
 * Pure and deterministic: identical on server and client, so there is no
 * hydration mismatch (there is no client-side theme mutation in this ticket).
 */
export function htmlThemeClass(theme: Theme): string {
  return theme === "dark" ? "dark" : "";
}
