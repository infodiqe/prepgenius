// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// Identity translator → assertions check the i18n key that was selected.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "as",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { PublicHeader } from "./PublicHeader";

afterEach(() => cleanup());

describe("PublicHeader", () => {
  it("renders section links and auth actions", () => {
    render(<PublicHeader />);
    expect(screen.getAllByText("features").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pricing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("faq").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "login" }).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByRole("link", { name: "register" }).length,
    ).toBeGreaterThan(0);
  });

  it("hides the mobile menu until the toggle is pressed", () => {
    render(<PublicHeader />);
    const toggle = screen.getByRole("button", { name: "open_menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("navigation", { name: "mobile_nav" })).toBeNull();
  });

  it("opens and closes the mobile menu", () => {
    render(<PublicHeader />);

    fireEvent.click(screen.getByRole("button", { name: "open_menu" }));
    expect(
      screen.getByRole("navigation", { name: "mobile_nav" }),
    ).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: "close_menu" });
    expect(closeBtn.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(closeBtn);
    expect(screen.queryByRole("navigation", { name: "mobile_nav" })).toBeNull();
  });

  it("shows the language switcher in the desktop nav", () => {
    render(<PublicHeader />);
    // Desktop switcher is always in the DOM (CSS-hidden on mobile).
    expect(
      screen.getAllByRole("group", { name: "language_selector" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("includes the language switcher inside the mobile menu", () => {
    render(<PublicHeader />);
    const before = screen.getAllByRole("group", {
      name: "language_selector",
    }).length;
    fireEvent.click(screen.getByRole("button", { name: "open_menu" }));
    // Opening the mobile menu adds a second switcher instance.
    expect(
      screen.getAllByRole("group", { name: "language_selector" }).length,
    ).toBe(before + 1);
  });
});
