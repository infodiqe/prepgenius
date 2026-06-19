// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import Sidebar from "./Sidebar";
import BottomTabBar from "./BottomTabBar";
import { navConfig } from "@/lib/nav/navConfig";
import { NAV_ICONS, getNavIcon } from "./navIcons";

const nav = vi.hoisted(() => ({ path: "/dashboard" }));
const ws = vi.hoisted(() => ({ active: "student" as string }));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("@/features/workspace/WorkspaceProvider", () => ({
  useWorkspace: () => ({
    activeWorkspace: ws.active,
    availableWorkspaces: [ws.active],
    setActiveWorkspace: () => {},
  }),
}));

afterEach(() => {
  cleanup();
  nav.path = "/dashboard";
  ws.active = "student";
});

describe("Sidebar (navConfig-driven)", () => {
  it("renders the student sidebar items in order", () => {
    ws.active = "student";
    const { getByRole } = render(<Sidebar />);
    const links = within(getByRole("navigation")).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("aria-label"))).toEqual(
      navConfig.student.sidebar.map((i) => i.labelKey),
    );
  });

  it("renders review items when the active workspace changes (no hardcoded list)", () => {
    ws.active = "review";
    const { getByRole } = render(<Sidebar />);
    const links = within(getByRole("navigation")).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("aria-label"))).toEqual(
      navConfig.review.sidebar.map((i) => i.labelKey),
    );
  });

  it("marks the active item with aria-current=page", () => {
    ws.active = "student";
    nav.path = "/practice";
    const { getByRole } = render(<Sidebar />);
    expect(
      getByRole("link", { name: "practice" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      getByRole("link", { name: "analytics" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("uses theme tokens (no hardcoded slate-/blue- classes)", () => {
    const { container } = render(<Sidebar />);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
  });
});

describe("BottomTabBar (navConfig-driven)", () => {
  it("renders the student bottom tabs in order", () => {
    ws.active = "student";
    const { getByRole } = render(<BottomTabBar />);
    const links = within(
      getByRole("navigation", { name: "Mobile Navigation" }),
    ).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("aria-label"))).toEqual(
      navConfig.student.bottomTabs.map((i) => i.labelKey),
    );
  });

  it("marks the active tab with aria-current=page", () => {
    ws.active = "student";
    nav.path = "/analytics";
    const { getByRole } = render(<BottomTabBar />);
    expect(
      getByRole("link", { name: "analytics" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("uses theme tokens (no hardcoded slate-/blue- classes)", () => {
    const { container } = render(<BottomTabBar />);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
  });
});

describe("nav icon registry", () => {
  it("maps every navConfig icon name to a lucide component", () => {
    const names = new Set<string>();
    for (const cfg of Object.values(navConfig)) {
      for (const item of [...cfg.sidebar, ...cfg.bottomTabs]) names.add(item.icon);
    }
    for (const name of names) {
      expect(NAV_ICONS[name], `missing icon mapping: ${name}`).toBeTruthy();
      expect(getNavIcon(name)).toBe(NAV_ICONS[name]);
    }
  });
});
