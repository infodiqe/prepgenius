// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { navConfig } from "@/lib/nav/navConfig";
import asMessages from "@/messages/as.json";
import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";

// Mocked context holder (vi.hoisted so it exists before the hoisted vi.mock).
const h = vi.hoisted(() => ({
  ctx: {
    activeWorkspace: "student" as string,
    availableWorkspaces: ["student"] as string[],
    setActiveWorkspace: vi.fn(),
  },
}));

vi.mock("./WorkspaceProvider", () => ({ useWorkspace: () => h.ctx }));
// i18n passthrough: t(key) === key, so labels render as their key.
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

afterEach(() => {
  cleanup();
  h.ctx.setActiveWorkspace.mockClear();
});

describe("WorkspaceSwitcher rendering", () => {
  it("renders nothing when only one workspace is available", () => {
    h.ctx.availableWorkspaces = ["student"];
    h.ctx.activeWorkspace = "student";
    const { container } = render(<WorkspaceSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a button per accessible workspace when more than one", () => {
    h.ctx.availableWorkspaces = ["student", "review", "admin"];
    h.ctx.activeWorkspace = "review";
    const { getAllByRole, getByRole } = render(<WorkspaceSwitcher />);
    expect(getAllByRole("button")).toHaveLength(3);
    // Only accessible workspaces are shown (exactly the provided three).
    expect(getByRole("button", { name: "student" })).toBeTruthy();
    expect(getByRole("button", { name: "review" })).toBeTruthy();
    expect(getByRole("button", { name: "admin" })).toBeTruthy();
  });
});

describe("WorkspaceSwitcher selection (persists via provider)", () => {
  it("calls setActiveWorkspace with the chosen workspace on click", () => {
    h.ctx.availableWorkspaces = ["student", "admin"];
    h.ctx.activeWorkspace = "student";
    const { getByRole } = render(<WorkspaceSwitcher />);
    fireEvent.click(getByRole("button", { name: "admin" }));
    expect(h.ctx.setActiveWorkspace).toHaveBeenCalledTimes(1);
    expect(h.ctx.setActiveWorkspace).toHaveBeenCalledWith("admin");
  });
});

describe("WorkspaceSwitcher accessibility", () => {
  it("exposes a labelled group and marks the active workspace with aria-current", () => {
    h.ctx.availableWorkspaces = ["student", "review"];
    h.ctx.activeWorkspace = "review";
    const { getByRole } = render(<WorkspaceSwitcher />);
    expect(getByRole("group", { name: "label" })).toBeTruthy();
    expect(
      getByRole("button", { name: "review" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(
      getByRole("button", { name: "student" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("uses native, keyboard-activatable <button> elements", () => {
    h.ctx.availableWorkspaces = ["student", "admin"];
    h.ctx.activeWorkspace = "student";
    const { getByRole } = render(<WorkspaceSwitcher />);
    const btn = getByRole("button", { name: "admin" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("type")).toBe("button");
  });
});

describe("workspace label i18n coverage (uses navConfig keys)", () => {
  const localeWs: Record<string, Record<string, string>> = {
    as: asMessages.workspace,
    en: enMessages.workspace,
    hi: hiMessages.workspace,
  };

  it("resolves a label for every navConfig workspace key + the group label in all locales", () => {
    const keys = [...Object.keys(navConfig), "label"];
    for (const key of keys) {
      for (const locale of ["as", "en", "hi"] as const) {
        expect(
          localeWs[locale][key],
          `workspace.${key} missing in ${locale}.json`,
        ).toBeTruthy();
      }
    }
  });
});
