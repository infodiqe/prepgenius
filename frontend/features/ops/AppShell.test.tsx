// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AppShell } from "./AppShell";
import { ROLES } from "@/lib/rbac/types";

const auth = vi.hoisted(() => ({ user: null as { roles: string[] } | null }));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, isLoading: false }),
}));

// Chrome + overlay children are unit-tested in their own files; mount as markers
// that echo the personas they receive so we can assert the derivation.
vi.mock("./Sidebar", () => ({
  default: ({ personas }: { personas?: string[] }) => (
    <div data-testid="ops-sidebar" data-personas={(personas ?? []).join(",")} />
  ),
}));
vi.mock("./TopBar", () => ({
  default: () => <div data-testid="ops-topbar" />,
}));
vi.mock("./MobileNav", () => ({
  MobileNav: ({ open, personas }: { open: boolean; personas?: string[] }) => (
    <div
      data-testid="ops-mobilenav"
      data-open={String(open)}
      data-personas={(personas ?? []).join(",")}
    />
  ),
}));
vi.mock("./CommandPalette", () => ({
  CommandPalette: ({ open }: { open: boolean }) => (
    <div data-testid="ops-palette" data-open={String(open)} />
  ),
}));
vi.mock("./NotificationDrawer", () => ({
  NotificationDrawer: ({ open }: { open: boolean }) => (
    <div data-testid="ops-drawer" data-open={String(open)} />
  ),
}));

afterEach(() => {
  cleanup();
  auth.user = null;
});

const child = <div data-testid="content">page</div>;

describe("Ops AppShell composition", () => {
  it("renders Sidebar, TopBar, MobileNav, main content, palette and drawer", () => {
    auth.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { getByTestId, getByRole } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("ops-sidebar")).toBeTruthy();
    expect(getByTestId("ops-topbar")).toBeTruthy();
    expect(getByTestId("ops-mobilenav")).toBeTruthy();
    expect(getByTestId("ops-palette")).toBeTruthy();
    expect(getByTestId("ops-drawer")).toBeTruthy();
    expect(getByTestId("content")).toBeTruthy();
    expect(getByRole("main")).toBeTruthy();
  });

  it("renders the optional WorkspaceHeader slot above main content", () => {
    auth.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { getByTestId } = render(
      <AppShell header={<div data-testid="ops-header" />}>{child}</AppShell>,
    );
    expect(getByTestId("ops-header")).toBeTruthy();
  });

  it("exposes the ops workspace via data-workspace", () => {
    auth.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { container } = render(<AppShell>{child}</AppShell>);
    expect(container.querySelector('[data-workspace="ops"]')).toBeTruthy();
  });

  it("derives personas from the authenticated user's roles (no hardcoded default)", () => {
    auth.user = { roles: [ROLES.SME] };
    const { getByTestId } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("ops-sidebar").getAttribute("data-personas")).toBe("sme");
    expect(getByTestId("ops-mobilenav").getAttribute("data-personas")).toBe(
      "sme",
    );
  });

  it("renders a skip link that targets the main region", () => {
    auth.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { getByText, getByRole } = render(<AppShell>{child}</AppShell>);
    const skip = getByText("Skip to main content") as HTMLAnchorElement;
    expect(skip.getAttribute("href")).toBe("#ops-main-content");
    expect(getByRole("main").getAttribute("id")).toBe("ops-main-content");
  });

  it("mounts overlays closed by default", () => {
    auth.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { getByTestId } = render(<AppShell>{child}</AppShell>);
    expect(getByTestId("ops-palette").getAttribute("data-open")).toBe("false");
    expect(getByTestId("ops-drawer").getAttribute("data-open")).toBe("false");
    expect(getByTestId("ops-mobilenav").getAttribute("data-open")).toBe("false");
  });

  it("uses theme tokens (no hardcoded slate-/blue- classes)", () => {
    auth.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { container } = render(<AppShell>{child}</AppShell>);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
  });
});
