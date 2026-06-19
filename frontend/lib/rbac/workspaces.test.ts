import { describe, it, expect } from "vitest";
import {
  DEFAULT_WORKSPACE,
  deriveWorkspaces,
  hasWorkspaceAccess,
  resolveActiveWorkspace,
} from "./workspaces";
import { ROLES } from "./types";

describe("deriveWorkspaces", () => {
  it("returns student-only for empty roles", () => {
    expect(deriveWorkspaces([])).toEqual(["student"]);
  });

  it("returns student-only for a plain student", () => {
    expect(deriveWorkspaces([ROLES.STUDENT])).toEqual(["student"]);
  });

  it("adds review for content_reviewer and sme", () => {
    expect(deriveWorkspaces([ROLES.CONTENT_REVIEWER])).toEqual([
      "student",
      "review",
    ]);
    expect(deriveWorkspaces([ROLES.SME])).toEqual(["student", "review"]);
  });

  it("adds review + admin for content_manager and platform_admin", () => {
    expect(deriveWorkspaces([ROLES.CONTENT_MANAGER])).toEqual([
      "student",
      "review",
      "admin",
    ]);
    expect(deriveWorkspaces([ROLES.PLATFORM_ADMIN])).toEqual([
      "student",
      "review",
      "admin",
    ]);
  });

  it("maps unmapped roles (teacher / unknown) to student-only", () => {
    expect(deriveWorkspaces([ROLES.TEACHER])).toEqual(["student"]);
    expect(deriveWorkspaces([ROLES.INSTITUTION_ADMIN])).toEqual(["student"]);
    expect(deriveWorkspaces(["not_a_role"])).toEqual(["student"]);
  });

  it("returns a stable student → review → admin order regardless of input order", () => {
    expect(
      deriveWorkspaces([ROLES.PLATFORM_ADMIN, ROLES.STUDENT]),
    ).toEqual(["student", "review", "admin"]);
  });

  it("does not duplicate workspaces for overlapping roles", () => {
    expect(
      deriveWorkspaces([ROLES.CONTENT_REVIEWER, ROLES.CONTENT_MANAGER]),
    ).toEqual(["student", "review", "admin"]);
  });
});

describe("hasWorkspaceAccess", () => {
  it("grants student to everyone, including empty roles", () => {
    expect(hasWorkspaceAccess([], "student")).toBe(true);
    expect(hasWorkspaceAccess([ROLES.PLATFORM_ADMIN], "student")).toBe(true);
  });

  it("grants review to a reviewer but not admin", () => {
    expect(hasWorkspaceAccess([ROLES.CONTENT_REVIEWER], "review")).toBe(true);
    expect(hasWorkspaceAccess([ROLES.CONTENT_REVIEWER], "admin")).toBe(false);
  });

  it("denies review/admin to a plain student", () => {
    expect(hasWorkspaceAccess([ROLES.STUDENT], "review")).toBe(false);
    expect(hasWorkspaceAccess([ROLES.STUDENT], "admin")).toBe(false);
  });
});

describe("resolveActiveWorkspace (last-used wins, Student fallback)", () => {
  it("opens the persisted workspace when the user still has access", () => {
    expect(
      resolveActiveWorkspace([ROLES.CONTENT_REVIEWER], "review"),
    ).toBe("review");
    expect(
      resolveActiveWorkspace([ROLES.PLATFORM_ADMIN], "admin"),
    ).toBe("admin");
  });

  it("falls back to Student when the cookie is absent", () => {
    expect(resolveActiveWorkspace([ROLES.PLATFORM_ADMIN], null)).toBe(
      "student",
    );
    expect(DEFAULT_WORKSPACE).toBe("student");
  });

  it("falls back to Student when the persisted workspace is no longer accessible", () => {
    // user had 'admin' persisted but now only holds a reviewer role
    expect(resolveActiveWorkspace([ROLES.CONTENT_REVIEWER], "admin")).toBe(
      "student",
    );
    // student-only user with a stale 'review' cookie
    expect(resolveActiveWorkspace([ROLES.STUDENT], "review")).toBe("student");
  });

  it("respects an explicit student selection", () => {
    expect(resolveActiveWorkspace([ROLES.PLATFORM_ADMIN], "student")).toBe(
      "student",
    );
  });
});
