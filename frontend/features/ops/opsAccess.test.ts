import { describe, expect, it } from "vitest";
import { deriveOpsPersonas, hasOpsAccess } from "./opsAccess";
import { OPS_PERSONAS } from "./opsNav";
import { ROLES } from "@/lib/rbac/types";

describe("deriveOpsPersonas — RBAC role → ops persona", () => {
  it("maps platform_admin to the super_admin persona", () => {
    expect(deriveOpsPersonas([ROLES.PLATFORM_ADMIN])).toEqual([
      OPS_PERSONAS.SUPER_ADMIN,
    ]);
  });

  it("maps each backing role to its persona", () => {
    expect(deriveOpsPersonas([ROLES.CONTENT_MANAGER])).toEqual([
      OPS_PERSONAS.CONTENT_MANAGER,
    ]);
    expect(deriveOpsPersonas([ROLES.CONTENT_REVIEWER])).toEqual([
      OPS_PERSONAS.REVIEWER,
    ]);
    expect(deriveOpsPersonas([ROLES.SME])).toEqual([OPS_PERSONAS.SME]);
    expect(deriveOpsPersonas([ROLES.INSTITUTION_ADMIN])).toEqual([
      OPS_PERSONAS.INSTITUTE_ADMIN,
    ]);
  });

  it("returns the union (deduped, stable order) for multi-role users", () => {
    expect(
      deriveOpsPersonas([ROLES.SME, ROLES.CONTENT_REVIEWER]),
    ).toEqual([OPS_PERSONAS.REVIEWER, OPS_PERSONAS.SME]);
  });

  it("returns no personas for non-ops roles (student/teacher)", () => {
    expect(deriveOpsPersonas([ROLES.STUDENT])).toEqual([]);
    expect(deriveOpsPersonas([ROLES.TEACHER])).toEqual([]);
    expect(deriveOpsPersonas([])).toEqual([]);
  });
});

describe("hasOpsAccess", () => {
  it("is true for any role with a backing persona", () => {
    expect(hasOpsAccess([ROLES.PLATFORM_ADMIN])).toBe(true);
    expect(hasOpsAccess([ROLES.SME])).toBe(true);
    expect(hasOpsAccess([ROLES.STUDENT, ROLES.CONTENT_MANAGER])).toBe(true);
  });

  it("is false for users with no ops-relevant role", () => {
    expect(hasOpsAccess([ROLES.STUDENT])).toBe(false);
    expect(hasOpsAccess([ROLES.TEACHER])).toBe(false);
    expect(hasOpsAccess([])).toBe(false);
  });
});
