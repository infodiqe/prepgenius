// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import TopBar from "./TopBar";

const spies = vi.hoisted(() => ({
  logout: vi.fn(),
  user: { full_name: "Test User", email: "t@example.com" } as
    | { full_name: string; email: string }
    | null,
}));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: spies.user, logout: spies.logout }),
}));

// jsdom lacks the APIs Radix DropdownMenu calls when opening via keyboard.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.scrollIntoView ??= () => {};
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
});

afterEach(() => {
  cleanup();
  spies.logout.mockReset();
  spies.user = { full_name: "Test User", email: "t@example.com" };
});

describe("Ops TopBar — identity & trust", () => {
  it("renders the authenticated user's initials in the avatar", () => {
    render(<TopBar />);
    expect(screen.getByText("TU")).toBeTruthy();
  });

  it("labels the command trigger 'Commands' (no fake search)", () => {
    render(<TopBar />);
    expect(screen.getByLabelText("Commands")).toBeTruthy();
  });

  it("shows the real name + email and a working Sign out (no Profile dead control)", async () => {
    render(<TopBar />);
    fireEvent.keyDown(screen.getByLabelText("Account menu"), { key: "Enter" });

    expect(await screen.findByText("Test User")).toBeTruthy();
    expect(screen.getByText("t@example.com")).toBeTruthy();
    expect(screen.queryByText("Profile")).toBeNull();

    fireEvent.click(screen.getByText("Sign out"));
    expect(spies.logout).toHaveBeenCalledTimes(1);
  });

  it("falls back to no badge text when there is no identity", () => {
    spies.user = null;
    render(<TopBar />);
    // Avatar fallback renders empty rather than a fake 'OP'.
    expect(screen.queryByText("OP")).toBeNull();
    expect(screen.queryByText("Operator")).toBeNull();
  });
});

describe("Ops TopBar — accessibility labels (Task 6)", () => {
  it("uses a state-aware theme toggle label", () => {
    render(<TopBar />);
    const toggle = screen.getByLabelText("Switch to dark theme");
    fireEvent.click(toggle);
    expect(screen.getByLabelText("Switch to light theme")).toBeTruthy();
  });

  it("announces unread state on the notification trigger", () => {
    const { rerender } = render(<TopBar unreadCount={0} />);
    expect(screen.getByLabelText("Notifications, no unread")).toBeTruthy();
    rerender(<TopBar unreadCount={3} />);
    expect(screen.getByLabelText("Notifications, 3 unread")).toBeTruthy();
  });
});
