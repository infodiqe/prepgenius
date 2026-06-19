/**
 * RBAC role identifiers — Sprint 0 · S0-T02.
 *
 * Mirrors the role seed in the backend (`accounts/models/rbac.py`). These are
 * the role names returned in `UserProfile.roles` (`readonly string[]`).
 *
 * The `Workspace` type is **owned by `lib/workspace/cookies`** and only
 * re-exported here so RBAC consumers have one import surface. It is never
 * redefined (S0-T01 is the single source of truth).
 */

export type { Workspace } from "@/lib/workspace/cookies";

/** Known RBAC roles (1:1 with backend seed). */
export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  INSTITUTION_ADMIN: "institution_admin",
  CONTENT_MANAGER: "content_manager",
  CONTENT_REVIEWER: "content_reviewer",
  SME: "sme",
  PLATFORM_ADMIN: "platform_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Shape of `UserProfile.roles` (the generated API type is structurally
 * `readonly string[]`). Declared locally to avoid importing the large generated
 * API types module for a single alias; the structural match is intentional.
 */
export type Roles = readonly string[];
