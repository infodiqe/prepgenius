import { describe, it, expect } from "vitest";
import { htmlThemeClass } from "./htmlThemeClass";
import { resolveTheme } from "./cookies";

describe("htmlThemeClass", () => {
  it("returns the 'dark' class for dark mode", () => {
    expect(htmlThemeClass("dark")).toBe("dark");
  });

  it("returns no class for light mode (light is the :root default)", () => {
    expect(htmlThemeClass("light")).toBe("");
  });
});

describe("html class derived from the theme cookie (AC #2 / #3)", () => {
  it("defaults to light (no class) when the cookie is absent", () => {
    expect(htmlThemeClass(resolveTheme(undefined))).toBe("");
    expect(htmlThemeClass(resolveTheme(null))).toBe("");
  });

  it("respects an existing dark cookie", () => {
    expect(htmlThemeClass(resolveTheme("dark"))).toBe("dark");
  });

  it("falls back to light (no class) on an invalid cookie value", () => {
    expect(htmlThemeClass(resolveTheme("midnight"))).toBe("");
  });
});
