// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { CreditBalanceCard } from "./CreditBalanceCard";
import type { OpsUserCredits } from "./billingService";

afterEach(() => cleanup());

function makeCredits(over: Partial<OpsUserCredits> = {}): OpsUserCredits {
  return {
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
    ...over,
  };
}

describe("CreditBalanceCard (read-only)", () => {
  it("shows available, reserved and lifetime", () => {
    render(<CreditBalanceCard credits={makeCredits()} />);
    expect(screen.getByText("120.00")).toBeTruthy();
    expect(screen.getByText("30.00")).toBeTruthy();
    expect(screen.getByText("200.00")).toBeTruthy();
  });

  it("derives Last Updated from the newest ledger entry", () => {
    render(<CreditBalanceCard credits={makeCredits()} />);
    expect(screen.getByText("Last Updated")).toBeTruthy();
    // formatDate renders the newest entry's created_at (en-GB).
    expect(screen.getByText(/2026/)).toBeTruthy();
  });

  it("shows an em dash for Last Updated when there is no ledger history", () => {
    render(<CreditBalanceCard credits={makeCredits({ recent_ledger: [] })} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("exposes no mutation controls (read-only card)", () => {
    render(<CreditBalanceCard credits={makeCredits()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
