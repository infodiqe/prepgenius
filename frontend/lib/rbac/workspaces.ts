import type { Workspace } from "@/lib/workspace/cookies";
import { ROLES, type Roles } from "./types";

/**
 * Workspace derivation — Sprint 0 · S0-T02.
 *
 * Pure mapping from a user's RBAC `roles[]` to the workspaces they may see, plus
 * resolution of the active workspace.
 *
 * **Presentation-only.** Deriving/resolving a workspace groups navigation for
 * the UI; it NEVER grants authorization. Route access is enforced server-side by
 * the route-group `RoleGuard` (ticket S0-T12) and by the API.
 *
 * The `Workspace` union is reused from `lib/workspace/cookies` (S0-T01) and is
 * never redefined here.
 */

/**
 * The Student workspace is the universal base experience: every authenticated
 * user has it (learners first; staff roles ADD review/admin on top). This is
 * what makes "default to Student" (the approved selection rule) always valid.
 */
export const DEFAULT_WORKSPACE: Workspace = "student";

/** Roles that unlock the Review workspace. */
const REVIEW_ROLES: readonly string[] = [
  ROLES.CONTENT_REVIEWER,
  ROLES.SME,
  ROLES.CONTENT_MANAGER,
  ROLES.PLATFORM_ADMIN,
];

/** Roles that unlock the Admin workspace. */
const ADMIN_ROLES: readonly string[] = [
  ROLES.CONTENT_MANAGER,
  ROLES.PLATFORM_ADMIN,
];

/**
 * Derive the ordered list of workspaces a user may access, from their roles.
 * Order is stable: `student → review → admin`. Always includes `student`.
 */
export function deriveWorkspaces(roles: Roles): Workspace[] {
  const result: Workspace[] = ["student"];
  if (roles.some((r) => REVIEW_ROLES.includes(r))) result.push("review");
  if (roles.some((r) => ADMIN_ROLES.includes(r))) result.push("admin");
  return result;
}

/** Whether the user's roles grant access to a given workspace. */
export function hasWorkspaceAccess(
  roles: Roles,
  workspace: Workspace,
): boolean {
  return deriveWorkspaces(roles).includes(workspace);
}

/**
 * Resolve the active workspace per the approved selection rule:
 * **last-used wins** — open the persisted workspace if the user still has access
 * to it; otherwise (absent / invalid / no-longer-accessible) fall back to the
 * Student workspace.
 *
 * Pure: the caller (`WorkspaceProvider`, S0-T07) reads the persisted value via
 * `getWorkspaceServer()` (S0-T01) and passes it in.
 */
export function resolveActiveWorkspace(
  roles: Roles,
  persisted: Workspace | null,
): Workspace {
  if (persisted && hasWorkspaceAccess(roles, persisted)) {
    return persisted;
  }
  return DEFAULT_WORKSPACE;
}
