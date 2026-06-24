// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { CreditLedgerTable } from "./CreditLedgerTable";
import type { CreditLedgerEntry } from "./billingService";

afterEach(() => cleanup());

function makeEntry(over: Partial<CreditLedgerEntry> = {}): CreditLedgerEntry {
  return {
    id: "l-1",
    transaction_type: "grant",
    amount: "100.00",
    balance_after: "100.00",
    description: "welcome bonus",
    reference_id: null,
    created_by: "admin-1",
    created_at: "2026-06-01T10:00:00Z",
    ...over,
  };
}

describe("CreditLedgerTable", () => {
  it("renders an empty state when there are no entries", () => {
    render(<CreditLedgerTable entries={[]} />);
    expect(screen.getByText("No ledger entries")).toBeTruthy();
  });

  it("renders a semantic table with the six columns", () => {
    render(<CreditLedgerTable entries={[makeEntry()]} />);
    const headers = within(screen.getByRole("table"))
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    for (const col of [
      "Date",
      "Transaction Type",
      "Amount",
      "Balance After",
      "Description",
      "Created By",
    ]) {
      expect(headers).toContain(col);
    }
  });

  it("renders entry values verbatim (amount, balance, description, type)", () => {
    render(
      <CreditLedgerTable
        entries={[makeEntry({ transaction_type: "adjustment", amount: "-25.00" })]}
      />,
    );
    expect(screen.getByText("Adjustment")).toBeTruthy();
    expect(screen.getByText("-25.00")).toBeTruthy();
    expect(screen.getByText("100.00")).toBeTruthy();
    expect(screen.getByText("welcome bonus")).toBeTruthy();
    expect(screen.getByText("admin-1")).toBeTruthy();
  });

  it("shows an em dash for a null Created By", () => {
    render(<CreditLedgerTable entries={[makeEntry({ created_by: null })]} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("hides cursor controls when no cursor handlers are provided", () => {
    render(<CreditLedgerTable entries={[makeEntry()]} />);
    expect(screen.queryByRole("navigation", { name: "Ledger pagination" })).toBeNull();
  });

  it("shows cursor controls (no page numbers) when handlers are provided", () => {
    const onNext = vi.fn();
    render(
      <CreditLedgerTable
        entries={[makeEntry()]}
        onNext={onNext}
        hasNext
        hasPrev={false}
      />,
    );
    const prev = screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement;
    const next = screen.getByRole("button", { name: "Next page" });
    expect(prev.disabled).toBe(true);
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalled();
  });
});
