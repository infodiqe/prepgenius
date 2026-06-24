// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { UserStatusBadge, userStatusLabel } from "./UserStatusBadge";

afterEach(() => cleanup());

describe("UserStatusBadge", () => {
  it("renders a text label for each known status (colour is never the sole signal)", () => {
    const { rerender } = render(<UserStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeTruthy();
    rerender(<UserStatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeTruthy();
    rerender(<UserStatusBadge status="suspended" />);
    expect(screen.getByText("Suspended")).toBeTruthy();
    rerender(<UserStatusBadge status="deleted" />);
    expect(screen.getByText("Deleted")).toBeTruthy();
  });

  it("renders a decorative (aria-hidden) icon alongside the label", () => {
    const { container } = render(<UserStatusBadge status="active" />);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });

  it("falls back to the raw value for an unknown status", () => {
    render(<UserStatusBadge status={"mystery" as never} />);
    expect(screen.getByText("mystery")).toBeTruthy();
  });

  it("userStatusLabel returns the human label or the raw value", () => {
    expect(userStatusLabel("suspended")).toBe("Suspended");
    expect(userStatusLabel("weird")).toBe("weird");
  });

  it("uses semantic tokens only (no hardcoded slate-/blue- classes)", () => {
    const { container } = render(<UserStatusBadge status="active" />);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
  });
});
