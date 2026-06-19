import { cookies } from "next/headers";

/**
 * Workspace cookie utilities — Sprint 0 · S0-T01.
 *
 * "Last-used workspace wins": this reader returns the workspace persisted in the
 * cookie, or `null` when the cookie is absent or invalid. Applying the **Student
 * default** and verifying the user still has access to the persisted workspace
 * are the responsibility of the consumer (`WorkspaceProvider`, ticket S0-T07) —
 * not this reader. Keeping the reader faithful (persisted-or-null) matches the
 * S0-T01 contract and the approved selection behaviour.
 *
 * Presentation-only: selecting a workspace NEVER grants authorization. Route
 * access is enforced server-side by the route-group `RoleGuard` (ticket S0-T12).
 *
 * The canonical `Workspace` identifier set is declared locally here (mirroring
 * how `lib/i18n/request.ts` declares `locales`) so this module is self-contained
 * and testable; the RBAC derivation module (S0-T02) consumes this type.
 */

/** Cookie name. Import this constant instead of using the string literal. */
export const WORKSPACE_COOKIE = "workspace";

/** Canonical workspace identifiers (presentation grouping of RBAC roles). */
export const workspaces = ["student", "review", "admin"] as const;
export type Workspace = (typeof workspaces)[number];

/**
 * Pure resolver — returns a valid {@link Workspace}, or `null` when the raw
 * value is absent or not a recognised workspace. The Student default is applied
 * downstream (S0-T07), never here.
 */
export function resolveWorkspace(
  raw: string | undefined | null,
): Workspace | null {
  return raw && (workspaces as readonly string[]).includes(raw)
    ? (raw as Workspace)
    : null;
}

/**
 * SSR reader — returns the persisted workspace from the `workspace` cookie, or
 * `null` when the cookie is missing or invalid.
 */
export async function getWorkspaceServer(): Promise<Workspace | null> {
  const cookieStore = await cookies();
  return resolveWorkspace(cookieStore.get(WORKSPACE_COOKIE)?.value);
}
