/**
 * Ops access derivation — OPS-HARDEN-02 Part A/B.
 *
 * Maps a user's **real RBAC roles** (`UserProfile.roles`, mirrored from the
 * backend role seed in `lib/rbac/types`) to the Operations Platform personas
 * that drive navigation visibility. This is the single source of truth for
 * "does this user belong in Ops, and which workspaces do they see" — both the
 * route guard (`OpsRouteGuard`) and the chrome (`Sidebar` / `MobileNav`) consume
 * it, so there is no duplicated permission logic.
 *
 * **Presentation-only.** Personas group navigation for the UI; they NEVER grant
 * authorization. Every Ops read/write is authorized server-side by the API
 * (RBAC + tenant isolation). Hiding/disabling is for clarity, not security
 * (UX architecture §15.1).
 *
 * Only roles that exist in the backend seed are mapped — no invented roles. The
 * `ops_manager` and `support` personas have no backing RBAC role yet, so no user
 * is mapped to them today; they remain in the nav config for when such roles are
 * seeded (and for the pure-config tests).
 */

import { ROLES, type Roles } from "@/lib/rbac/types";
import { OPS_PERSONAS, type OpsPersona } from "./opsNav";

/**
 * Role → persona mapping, in nav-priority order. A single role grants a single
 * persona; a user with several roles gets the union (deduped, stable order).
 */
const ROLE_TO_PERSONA: ReadonlyArray<readonly [string, OpsPersona]> = [
  [ROLES.PLATFORM_ADMIN, OPS_PERSONAS.SUPER_ADMIN],
  [ROLES.CONTENT_MANAGER, OPS_PERSONAS.CONTENT_MANAGER],
  [ROLES.CONTENT_REVIEWER, OPS_PERSONAS.REVIEWER],
  [ROLES.SME, OPS_PERSONAS.SME],
  [ROLES.INSTITUTION_ADMIN, OPS_PERSONAS.INSTITUTE_ADMIN],
];

/**
 * Derive the Ops personas a user may present as, from their RBAC roles. Returns
 * personas in {@link ROLE_TO_PERSONA} order with duplicates removed; an empty
 * array means the user has no Operations access at all.
 */
export function deriveOpsPersonas(roles: Roles): OpsPersona[] {
  const roleSet = new Set(roles);
  const personas: OpsPersona[] = [];
  for (const [role, persona] of ROLE_TO_PERSONA) {
    if (roleSet.has(role) && !personas.includes(persona)) {
      personas.push(persona);
    }
  }
  return personas;
}

/** Whether the user's roles grant access to the Operations Platform. */
export function hasOpsAccess(roles: Roles): boolean {
  return deriveOpsPersonas(roles).length > 0;
}
