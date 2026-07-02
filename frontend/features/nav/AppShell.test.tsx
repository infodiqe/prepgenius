// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AppShell } from "./AppShell";

const nav = vi.hoisted(() => ({ path: "/dashboard" }));
const ws = vi.hoisted(() => ({ active: "student" as string }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("@/features/workspace/WorkspaceProvider", () => ({
  useWorkspace: () => ({
    activeWorkspace: ws.active,
    availableWorkspaces: [ws.active],
    setActiveWorkspace: () => {},
  }),
}));
// Chrome components are unit-tested in their own files; mount as markers here.
vi.mock("@/features/nav/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock("@/features/nav/TopBar", () => ({
  default: () => <div data-testid="topbar" />,
}));
vi.mock("@/features/nav/BottomTabBar", () => ({
  default: () => <div data-testid="bottomtabbar" />,
}));

const child = <div data-testid="content">page</div>;

afterEach(() => {
  cleanup();
  nav.path = "/dashboard";
  ws.active = "student";
});

describe("AppShell standard composition", () => {
  it("renders Sidebar, TopBar, BottomTabBar and children on a normal route", () => {
    const { getByTestId } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("sidebar")).toBeTruthy();
    expect(getByTestId("topbar")).toBeTruthy();
    expect(getByTestId("bottomtabbar")).toBeTruthy();
    expect(getByTestId("content")).toBeTruthy();
  });

  it("exposes the active workspace via data-workspace", () => {
    const { container } = render(<AppShell>{child}</AppShell>);
    expect(container.querySelector('[data-workspace="student"]')).toBeTruthy();
  });

  it("preserves the mobile bottom bar and bottom padding for it", () => {
    const { getByTestId, container } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("bottomtabbar")).toBeTruthy();
    expect(container.querySelector("main")?.className).toContain("pb-24");
  });

  it("uses theme tokens (no hardcoded slate-/blue- classes)", () => {
    const { container } = render(<AppShell>{child}</AppShell>);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
  });
});

describe("AppShell review/admin use the same structure", () => {
  it.each(["review", "admin"])("workspace %s renders the same shell", (w) => {
    ws.active = w;
    const { getByTestId, container } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("sidebar")).toBeTruthy();
    expect(getByTestId("topbar")).toBeTruthy();
    expect(getByTestId("bottomtabbar")).toBeTruthy();
    expect(container.querySelector(`[data-workspace="${w}"]`)).toBeTruthy();
  });
});

describe("AppShell player bypass", () => {
  it("renders ONLY children (no chrome) on a player route", () => {
    nav.path = "/practice/abc123";
    const { getByTestId, queryByTestId } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("content")).toBeTruthy();
    expect(queryByTestId("sidebar")).toBeNull();
    expect(queryByTestId("topbar")).toBeNull();
    expect(queryByTestId("bottomtabbar")).toBeNull();
  });

  it("does NOT bypass on the /practice hub route", () => {
    nav.path = "/practice";
    const { getByTestId } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("sidebar")).toBeTruthy();
  });
});
