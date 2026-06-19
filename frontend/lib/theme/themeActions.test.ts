import { describe, it, expect } from "vitest";
import {
  THEME_COOKIE_MAX_AGE,
  buildThemeCookie,
  nextTheme,
} from "./themeActions";

// Note: the cookie name is passed as a literal here (not imported from
// `./cookies`) to keep this a pure node test — `cookies.ts` pulls in the
// server-only `next/headers`. The single-source `THEME_COOKIE` is injected by
// the server layout at runtime; the layout wiring is covered by type-check.

describe("nextTheme", () => {
  it("flips light → dark and dark → light", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

describe("buildThemeCookie", () => {
  it("uses a 1-year max-age", () => {
    expect(THEME_COOKIE_MAX_AGE).toBe(31536000);
  });

  it("serializes with root path, 1-year max-age and SameSite=Lax", () => {
    expect(buildThemeCookie("theme", "dark")).toBe(
      "theme=dark; path=/; max-age=31536000; SameSite=Lax",
    );
    expect(buildThemeCookie("theme", "light")).toBe(
      "theme=light; path=/; max-age=31536000; SameSite=Lax",
    );
  });

  it("places the injected cookie name first", () => {
    expect(buildThemeCookie("theme", "dark").startsWith("theme=")).toBe(true);
  });
});
