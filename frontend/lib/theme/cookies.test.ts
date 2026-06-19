import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  THEME_COOKIE,
  defaultTheme,
  resolveTheme,
  getThemeServer,
} from "./cookies";

// Mock the Next.js server cookie store for the SSR reader tests.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { cookies } from "next/headers";

describe("resolveTheme (pure)", () => {
  it("defaults to light when the value is absent", () => {
    expect(resolveTheme(undefined)).toBe("light");
    expect(resolveTheme(null)).toBe("light");
    expect(defaultTheme).toBe("light");
  });

  it("round-trips a valid value", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("falls back to light on an invalid value", () => {
    expect(resolveTheme("blue")).toBe("light");
    expect(resolveTheme("")).toBe("light");
    expect(resolveTheme("LIGHT")).toBe("light"); // case-sensitive by design
  });
});

describe("getThemeServer (SSR reader)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads and resolves the theme cookie", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === THEME_COOKIE ? { value: "dark" } : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getThemeServer()).resolves.toBe("dark");
  });

  it("defaults to light when the cookie is missing", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getThemeServer()).resolves.toBe("light");
  });
});
