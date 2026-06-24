// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { UserTable } from "./UserTable";
import type { OpsUserListItem } from "./userService";

afterEach(() => cleanup());

function makeUser(over: Partial<OpsUserListItem> = {}): OpsUserListItem {
  return {
    id: "u-1",
    email: "amla@example.com",
    full_name: "Amla Bora",
    roles: ["support"],
    status: "active",
    target_exam: { id: "exam-1", code: "CTET", name: "CTET Paper I" },
    created_at: "2026-01-15T08:00:00Z",
    ...over,
  };
}

function baseProps(
  over: Partial<React.ComponentProps<typeof UserTable>> = {},
): React.ComponentProps<typeof UserTable> {
  return {
    phase: "ready",
    users: [makeUser()],
    onOpen: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
}

describe("UserTable", () => {
  it("renders a loading state", () => {
    render(<UserTable {...baseProps({ phase: "loading", users: [] })} />);
    expect(screen.getByRole("status", { name: "Loading users" })).toBeTruthy();
  });

  it("renders an error state with Retry that fires onRetry", () => {
    const onRetry = vi.fn();
    render(<UserTable {...baseProps({ phase: "error", users: [], onRetry })} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders a forbidden state (no retry)", () => {
    render(<UserTable {...baseProps({ phase: "forbidden", users: [] })} />);
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("renders an unauthorized state", () => {
    render(<UserTable {...baseProps({ phase: "unauthorized", users: [] })} />);
    expect(screen.getByText("Sign in required")).toBeTruthy();
  });

  it("renders an empty state when there are no users", () => {
    render(<UserTable {...baseProps({ users: [] })} />);
    expect(screen.getByText("No users found")).toBeTruthy();
  });

  it("renders a semantic table with the six columns", () => {
    render(<UserTable {...baseProps()} />);
    const headers = within(screen.getByRole("table"))
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    for (const col of ["Name", "Email", "Status", "Roles", "Target Exam", "Joined"]) {
      expect(headers).toContain(col);
    }
  });

  it("shows the nested target exam name, status badge and joined roles", () => {
    render(
      <UserTable
        {...baseProps({
          users: [makeUser({ roles: ["support", "operations"] })],
        })}
      />,
    );
    expect(screen.getByText("Amla Bora")).toBeTruthy();
    expect(screen.getByText("amla@example.com")).toBeTruthy();
    expect(screen.getByText("CTET Paper I")).toBeTruthy();
    expect(screen.getByText("support, operations")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("opens a user via the keyboard-accessible action button", () => {
    const onOpen = vi.fn();
    render(<UserTable {...baseProps({ onOpen })} />);
    fireEvent.click(screen.getByRole("button", { name: "Open user Amla Bora" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "u-1" }));
  });

  it("opens a user on row click", () => {
    const onOpen = vi.fn();
    render(<UserTable {...baseProps({ onOpen })} />);
    fireEvent.click(screen.getByText("Amla Bora"));
    expect(onOpen).toHaveBeenCalled();
  });

  it("shows an em dash when the user has no target exam", () => {
    render(<UserTable {...baseProps({ users: [makeUser({ target_exam: null })] })} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});
