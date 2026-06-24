// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { BillingWorkspace } from "./BillingWorkspace";
import {
  listOpsUsers,
  getUserCredits,
  type OpsUserCredits,
  type OpsUserListItem,
} from "./billingService";
import { ApiError } from "@/lib/errors";

vi.mock("./billingService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./billingService")>();
  return { ...actual, listOpsUsers: vi.fn(), getUserCredits: vi.fn() };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const USER: OpsUserListItem = {
  id: "u-1",
  email: "amla@example.com",
  full_name: "Amla Bora",
  roles: ["student"],
  status: "active",
  target_exam: null,
  created_at: "2026-01-15T08:00:00Z",
};

const CREDITS: OpsUserCredits = {
  balance: "120.00",
  reserved: "30.00",
  lifetime: "200.00",
  recent_ledger: [
    {
      id: "l-1",
      transaction_type: "grant",
      amount: "100.00",
      balance_after: "100.00",
      description: "welcome",
      reference_id: null,
      created_by: "admin-1",
      created_at: "2026-06-01T10:00:00Z",
    },
  ],
};

function primeSearch() {
  (listOpsUsers as Mock).mockResolvedValue({
    results: [USER],
    nextCursor: null,
    prevCursor: null,
  });
}

async function searchAndSelect() {
  fireEvent.change(screen.getByLabelText("Find a user"), {
    target: { value: "amla" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  fireEvent.click(await screen.findByRole("button", { name: /Amla Bora/ }));
}

describe("BillingWorkspace", () => {
  it("shows the empty state before a user is selected", () => {
    primeSearch();
    render(<BillingWorkspace />);
    expect(screen.getByText("Select a user")).toBeTruthy();
  });

  it("searches, selects a user and loads their credits + ledger + adjust action", async () => {
    primeSearch();
    (getUserCredits as Mock).mockResolvedValue(CREDITS);
    render(<BillingWorkspace />);
    await searchAndSelect();

    expect(await screen.findByText("Credit balance")).toBeTruthy();
    expect(getUserCredits).toHaveBeenCalledWith("u-1");
    expect(screen.getByRole("table")).toBeTruthy(); // ledger
    expect(screen.getByText("welcome")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adjust credits" })).toBeTruthy();
  });

  it("surfaces the forbidden state when the credits API returns 403", async () => {
    primeSearch();
    (getUserCredits as Mock).mockRejectedValue(new ApiError(403, {}, "forbidden"));
    render(<BillingWorkspace />);
    await searchAndSelect();
    expect(await screen.findByText("Access denied")).toBeTruthy();
  });

  it("surfaces a generic error with retry on other failures", async () => {
    primeSearch();
    (getUserCredits as Mock).mockRejectedValue(new Error("boom"));
    render(<BillingWorkspace />);
    await searchAndSelect();
    expect(await screen.findByText("Could not load credits")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
