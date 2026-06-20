// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const state = vi.hoisted(() => ({ locale: "as" }));
const nav = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => state.locale,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: nav.refresh }),
}));

import { LanguageSwitcher } from "./LanguageSwitcher";

afterEach(() => {
  cleanup();
  document.cookie = "locale=; Max-Age=0; path=/";
});
beforeEach(() => {
  state.locale = "as";
  nav.refresh.mockReset();
  document.cookie = "locale=; Max-Age=0; path=/";
});

describe("LanguageSwitcher", () => {
  it("renders a labelled group with all three languages", () => {
    render(<LanguageSwitcher />);
    expect(
      screen.getByRole("group", { name: "language_selector" }),
    ).toBeTruthy();
    // Accessible names come from the translated language names (a11y).
    expect(screen.getByRole("button", { name: "assamese" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "hindi" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "english" })).toBeTruthy();
  });

  it("marks the active locale with aria-current", () => {
    render(<LanguageSwitcher />);
    expect(
      screen.getByRole("button", { name: "assamese" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "hindi" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("writes the locale cookie and refreshes on change", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "english" }));
    expect(document.cookie).toContain("locale=en");
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the active locale is reselected", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "assamese" }));
    expect(nav.refresh).not.toHaveBeenCalled();
  });

  it("reflects the persisted locale (e.g. after reload) as active", () => {
    // Simulates a reload where the server resolved the cookie to Hindi.
    state.locale = "hi";
    render(<LanguageSwitcher />);
    expect(
      screen.getByRole("button", { name: "hindi" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "assamese" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});
