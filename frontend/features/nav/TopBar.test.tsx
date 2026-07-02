// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TopBar from "./TopBar";

const spies = vi.hoisted(() => ({ logout: vi.fn(), push: vi.fn() }));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { full_name: "Test User", email: "t@example.com" },
    logout: spies.logout,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: spies.push }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
// Child components are mounted as markers; they are unit-tested in their own files.
vi.mock("@/features/theme/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
vi.mock("@/features/workspace/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher" />,
}));

afterEach(() => cleanup());

describe("TopBar", () => {
  it("mounts ThemeToggle and WorkspaceSwitcher", () => {
    const { getByTestId } = render(<TopBar />);
    expect(getByTestId("theme-toggle")).toBeTruthy();
    expect(getByTestId("workspace-switcher")).toBeTruthy();
  });

  it("preserves the language switcher and profile menu controls", () => {
    const { getByLabelText } = render(<TopBar />);
    // aria-labels are now localized; the test's useTranslations mock echoes the key.
    expect(getByLabelText("language_selector")).toBeTruthy();
    expect(getByLabelText("profile_menu")).toBeTruthy();
  });

  it("renders the authenticated user's initials in the avatar", () => {
    const { getByText } = render(<TopBar />);
    expect(getByText("TU")).toBeTruthy();
  });

  it("uses theme tokens (no hardcoded slate-/blue- classes)", () => {
    const { container } = render(<TopBar />);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
  });
});
