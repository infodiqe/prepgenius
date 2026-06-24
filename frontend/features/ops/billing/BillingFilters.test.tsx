// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { BillingFilters } from "./BillingFilters";
import type { OpsUserListItem } from "./billingService";

afterEach(() => cleanup());

const USER: OpsUserListItem = {
  id: "u-1",
  email: "amla@example.com",
  full_name: "Amla Bora",
  roles: ["student"],
  status: "active",
  target_exam: null,
  created_at: "2026-01-15T08:00:00Z",
};

function baseProps(
  over: Partial<React.ComponentProps<typeof BillingFilters>> = {},
): React.ComponentProps<typeof BillingFilters> {
  return {
    search: "",
    onSearchChange: vi.fn(),
    onSearchSubmit: vi.fn(),
    phase: "idle",
    results: [],
    selectedUserId: null,
    onSelectUser: vi.fn(),
    ...over,
  };
}

describe("BillingFilters (user lookup)", () => {
  it("submits the search server-side", () => {
    const onSearchSubmit = vi.fn();
    render(<BillingFilters {...baseProps({ onSearchSubmit })} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearchSubmit).toHaveBeenCalled();
  });

  it("reports typing", () => {
    const onSearchChange = vi.fn();
    render(<BillingFilters {...baseProps({ onSearchChange })} />);
    fireEvent.change(screen.getByLabelText("Find a user"), {
      target: { value: "amla" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("amla");
  });

  it("renders a loading state", () => {
    render(<BillingFilters {...baseProps({ phase: "loading" })} />);
    expect(screen.getByRole("status", { name: "Loading users" })).toBeTruthy();
  });

  it("renders an error state", () => {
    render(<BillingFilters {...baseProps({ phase: "error" })} />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("shows an empty message when there are no results", () => {
    render(<BillingFilters {...baseProps({ phase: "ready", results: [] })} />);
    expect(screen.getByText("No users match your search.")).toBeTruthy();
  });

  it("lists results and selects one (with aria-pressed)", () => {
    const onSelectUser = vi.fn();
    render(
      <BillingFilters
        {...baseProps({
          phase: "ready",
          results: [USER],
          selectedUserId: "u-1",
          onSelectUser,
        })}
      />,
    );
    const btn = screen.getByRole("button", { name: /Amla Bora/ });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(btn);
    expect(onSelectUser).toHaveBeenCalledWith(USER);
  });
});
