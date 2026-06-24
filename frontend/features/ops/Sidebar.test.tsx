// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, within } from "@testing-library/react";
import Sidebar from "./Sidebar";
import { visibleOpsNavForPersonas, OPS_PERSONAS } from "./opsNav";

const nav = vi.hoisted(() => ({ path: "/ops" }));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

afterEach(() => {
  cleanup();
  nav.path = "/ops";
});

/** Live (navigable) items are real anchors with an href; "Coming Soon" items are
 * aria-disabled spans (role=link, no href). */
function liveLinkLabels(navEl: HTMLElement): (string | null)[] {
  return within(navEl)
    .getAllByRole("link")
    .filter((el) => el.tagName === "A" && el.getAttribute("href"))
    .map((el) => el.getAttribute("aria-label"));
}

describe("Ops Sidebar (config-driven, role-aware)", () => {
  it("renders the live + coming-soon workspaces for super admin, in config order", () => {
    const { getByRole } = render(
      <Sidebar personas={[OPS_PERSONAS.SUPER_ADMIN]} />,
    );
    const navEl = getByRole("navigation");
    const items = visibleOpsNavForPersonas([OPS_PERSONAS.SUPER_ADMIN]);

    // Live links (have href) match the implemented workspaces, in order.
    expect(liveLinkLabels(navEl)).toEqual(
      items.filter((i) => !i.comingSoon).map((i) => i.label),
    );
    // Coming-soon items render disabled with a badge, one per unimplemented item.
    const comingSoon = within(navEl).getAllByLabelText(/\(coming soon\)$/);
    expect(comingSoon).toHaveLength(items.filter((i) => i.comingSoon).length);
    expect(within(navEl).getAllByText("Coming Soon")).toHaveLength(
      comingSoon.length,
    );
  });

  it("Reviewer sees Review only", () => {
    const { getByRole } = render(
      <Sidebar personas={[OPS_PERSONAS.REVIEWER]} />,
    );
    expect(liveLinkLabels(getByRole("navigation"))).toEqual(["Review Queue"]);
  });

  it("SME sees Review Queue and a (coming soon) SME Review", () => {
    const { getByRole } = render(<Sidebar personas={[OPS_PERSONAS.SME]} />);
    const navEl = getByRole("navigation");
    expect(liveLinkLabels(navEl)).toEqual(["Review Queue"]);
    expect(within(navEl).getByLabelText("SME Review (coming soon)")).toBeTruthy();
    // SME must not see Billing or AI Operations at all.
    expect(within(navEl).queryByText("Billing")).toBeNull();
    expect(within(navEl).queryByText("AI Operations")).toBeNull();
  });

  it("Support sees only the permitted workspaces (Overview + Users)", () => {
    const { getByRole } = render(
      <Sidebar personas={[OPS_PERSONAS.SUPPORT]} />,
    );
    const navEl = getByRole("navigation");
    // Overview and Users (User 360, OPS-06) are both live for Support.
    expect(liveLinkLabels(navEl)).toEqual(["Overview", "Users"]);
    expect(within(navEl).queryByText("Billing")).toBeNull();
    expect(within(navEl).queryByText("Settings")).toBeNull();
  });

  it("renders a multi-role user the union of their personas' workspaces", () => {
    const { getByRole } = render(
      <Sidebar personas={[OPS_PERSONAS.REVIEWER, OPS_PERSONAS.SME]} />,
    );
    const navEl = getByRole("navigation");
    expect(liveLinkLabels(navEl)).toEqual(["Review Queue"]);
    expect(within(navEl).getByLabelText("SME Review (coming soon)")).toBeTruthy();
  });

  it("renders Coming Soon items as non-navigable, aria-disabled, keyboard-focusable", () => {
    const { getByRole } = render(
      <Sidebar personas={[OPS_PERSONAS.SUPER_ADMIN]} />,
    );
    const settings = within(getByRole("navigation")).getByLabelText(
      "Settings (coming soon)",
    );
    expect(settings.tagName).toBe("SPAN"); // not an anchor → cannot navigate / 404
    expect(settings.getAttribute("href")).toBeNull();
    expect(settings.getAttribute("aria-disabled")).toBe("true");
    expect(settings.getAttribute("tabindex")).toBe("0"); // still reachable
  });

  it("marks the active workspace with aria-current=page", () => {
    nav.path = "/ops/review";
    const { getByRole } = render(
      <Sidebar personas={[OPS_PERSONAS.SUPER_ADMIN]} />,
    );
    expect(
      getByRole("link", { name: "Review Queue" }).getAttribute("aria-current"),
    ).toBe("page");
    // Overview ("/ops") must NOT be active on a sub-route.
    expect(
      getByRole("link", { name: "Overview" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("collapse toggle exposes aria-expanded and flips on click", () => {
    const { getByRole } = render(
      <Sidebar personas={[OPS_PERSONAS.SUPER_ADMIN]} />,
    );
    const toggle = getByRole("button", { name: "Collapse sidebar" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    const collapsed = getByRole("button", { name: "Expand sidebar" });
    expect(collapsed.getAttribute("aria-expanded")).toBe("false");
  });

  it("uses theme tokens (no hardcoded slate-/blue- classes)", () => {
    const { container } = render(
      <Sidebar personas={[OPS_PERSONAS.SUPER_ADMIN]} />,
    );
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
  });
});
