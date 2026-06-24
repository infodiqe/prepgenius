// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { MobileNav } from "./MobileNav";
import { OPS_PERSONAS } from "./opsNav";

const nav = vi.hoisted(() => ({ path: "/ops" }));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, onClick, ...rest }: any) => (
    <a
      href={typeof href === "string" ? href : "#"}
      onClick={onClick}
      {...rest}
    >
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

afterEach(() => {
  cleanup();
  nav.path = "/ops";
});

describe("Ops MobileNav drawer", () => {
  it("renders nothing when closed", () => {
    render(
      <MobileNav
        open={false}
        onOpenChange={() => {}}
        personas={[OPS_PERSONAS.SUPER_ADMIN]}
      />,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("opens and renders the role-scoped nav items (reuses the shared config)", () => {
    render(
      <MobileNav
        open
        onOpenChange={() => {}}
        personas={[OPS_PERSONAS.REVIEWER]}
      />,
    );
    const navEl = screen.getByRole("navigation", {
      name: "Operations navigation",
    });
    // Reviewer → Review only (live link).
    expect(
      within(navEl).getByRole("link", { name: "Review Queue" }),
    ).toBeTruthy();
    expect(within(navEl).queryByText("Billing")).toBeNull();
  });

  it("closes via the (consistently labelled) close button", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileNav
        open
        onOpenChange={onOpenChange}
        personas={[OPS_PERSONAS.SUPER_ADMIN]}
      />,
    );
    fireEvent.click(screen.getByLabelText("Close navigation"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on Escape (Radix focus/keyboard backbone)", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileNav
        open
        onOpenChange={onOpenChange}
        personas={[OPS_PERSONAS.SUPER_ADMIN]}
      />,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on navigation (clicking a live link)", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileNav
        open
        onOpenChange={onOpenChange}
        personas={[OPS_PERSONAS.SUPER_ADMIN]}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Review Queue" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("has an accessible dialog name and moves focus into the drawer", () => {
    render(
      <MobileNav
        open
        onOpenChange={() => {}}
        personas={[OPS_PERSONAS.SUPER_ADMIN]}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("Operations navigation");
    // Radix moves focus inside the drawer on open (focus management backbone).
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
