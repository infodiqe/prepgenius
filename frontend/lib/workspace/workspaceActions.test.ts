import { describe, it, expect } from "vitest";
import {
  WORKSPACE_COOKIE_MAX_AGE,
  buildWorkspaceCookie,
} from "./workspaceActions";
// Same functions the WorkspaceProvider composes (client-safe; no next/headers).
import { resolveActiveWorkspace, hasWorkspaceAccess } from "@/lib/rbac/workspaces";
import { ROLES } from "@/lib/rbac/types";

// Cookie name passed as a literal to keep this a pure node test — `cookies.ts`
// pulls in the server-only `next/headers`. The single-source `WORKSPACE_COOKIE`
// is injected by the server layout at runtime (covered by type-check).

describe("buildWorkspaceCookie", () => {
  it("uses a 1-year max-age", () => {
    expect(WORKSPACE_COOKIE_MAX_AGE).toBe(31536000);
  });

  it("serializes with root path, 1-year max-age and SameSite=Lax", () => {
    expect(buildWorkspaceCookie("workspace", "review")).toBe(
      "workspace=review; path=/; max-age=31536000; SameSite=Lax",
    );
    expect(buildWorkspaceCookie("workspace", "student")).toBe(
      "workspace=student; path=/; max-age=31536000; SameSite=Lax",
    );
  });

  it("places the injected cookie name first", () => {
    expect(buildWorkspaceCookie("workspace", "admin").startsWith("workspace=")).toBe(
      true,
    );
  });
});

describe("provider selection rule (AC 1–4)", () => {
  it("opens the persisted workspace when still accessible (last-used wins)", () => {
    expect(resolveActiveWorkspace([ROLES.PLATFORM_ADMIN], "admin")).toBe("admin");
    expect(resolveActiveWorkspace([ROLES.CONTENT_REVIEWER], "review")).toBe(
      "review",
    );
  });

  it("defaults to Student when the cookie is absent", () => {
    expect(resolveActiveWorkspace([ROLES.PLATFORM_ADMIN], null)).toBe("student");
  });

  it("defaults to Student when the persisted workspace is inaccessible/invalid", () => {
    expect(resolveActiveWorkspace([ROLES.CONTENT_REVIEWER], "admin")).toBe(
      "student",
    );
    expect(resolveActiveWorkspace([ROLES.STUDENT], "review")).toBe("student");
  });

  it("is presentation-only: a selection the roles don't grant is rejected", () => {
    // setActiveWorkspace guards with hasWorkspaceAccess before persisting.
    expect(hasWorkspaceAccess([ROLES.STUDENT], "admin")).toBe(false);
    expect(hasWorkspaceAccess([ROLES.PLATFORM_ADMIN], "admin")).toBe(true);
  });
});
