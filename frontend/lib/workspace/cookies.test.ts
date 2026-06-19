import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WORKSPACE_COOKIE,
  resolveWorkspace,
  getWorkspaceServer,
} from "./cookies";

// Mock the Next.js server cookie store for the SSR reader tests.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { cookies } from "next/headers";

describe("resolveWorkspace (pure)", () => {
  it("returns null when the value is absent", () => {
    expect(resolveWorkspace(undefined)).toBeNull();
    expect(resolveWorkspace(null)).toBeNull();
  });

  it("round-trips each valid workspace", () => {
    expect(resolveWorkspace("student")).toBe("student");
    expect(resolveWorkspace("review")).toBe("review");
    expect(resolveWorkspace("admin")).toBe("admin");
  });

  it("returns null on an invalid value (consumer applies Student default)", () => {
    expect(resolveWorkspace("teacher")).toBeNull();
    expect(resolveWorkspace("")).toBeNull();
    expect(resolveWorkspace("Student")).toBeNull(); // case-sensitive by design
  });
});

describe("getWorkspaceServer (SSR reader)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads and resolves the workspace cookie", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === WORKSPACE_COOKIE ? { value: "review" } : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getWorkspaceServer()).resolves.toBe("review");
  });

  it("returns null when the cookie is missing", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getWorkspaceServer()).resolves.toBeNull();
  });
});
