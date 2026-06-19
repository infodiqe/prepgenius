import type { Workspace } from "./cookies";

/**
 * Client-safe workspace actions — Sprint 0 · S0-T07.
 *
 * Pure helper used by the (client) `WorkspaceProvider` to persist the selection.
 * Imports only the `Workspace` *type* from `lib/workspace/cookies` (erased at
 * compile time), so it never pulls the server-only `next/headers` dependency
 * into the client bundle.
 */

/** One year in seconds — workspace cookie lifetime (matches the cookie registry). */
export const WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Build the client-set workspace cookie string (root path, `SameSite=Lax`,
 * 1-year), consistent with the theme/locale cookie pattern. The `name` is
 * injected from the single source (`WORKSPACE_COOKIE`) by the caller.
 *
 * The cookie is **presentation-only** — it records the last-used workspace and
 * never grants authorization (enforced server-side by route guards, S0-T12).
 */
export function buildWorkspaceCookie(name: string, workspace: Workspace): string {
  return `${name}=${workspace}; path=/; max-age=${WORKSPACE_COOKIE_MAX_AGE}; SameSite=Lax`;
}
