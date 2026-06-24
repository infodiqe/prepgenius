// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { CreditOperationsPanel } from "./CreditOperationsPanel";
import type { OpsCreditAnalytics } from "./analyticsService";

afterEach(() => cleanup());

const data: OpsCreditAnalytics = {
  total_granted: "1000.00",
  total_reserved: "30.00",
  total_debited: "250.00",
  active_wallets: 8,
};

describe("CreditOperationsPanel (Part E — credit analytics)", () => {
  it("renders ledger movement (exact decimals) and active wallets", () => {
    render(<CreditOperationsPanel data={data} phase="ready" />);
    expect(screen.getByRole("region", { name: "Credit operations" })).toBeTruthy();
    expect(screen.getByText("1000.00")).toBeTruthy();
    expect(screen.getByText("30.00")).toBeTruthy();
    expect(screen.getByText("250.00")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
  });

  it("shows a loading state", () => {
    render(<CreditOperationsPanel data={null} phase="loading" />);
    expect(
      screen.getByRole("status", { name: "Loading credit operations" }),
    ).toBeTruthy();
  });

  it("shows an error state with a working Retry", () => {
    const onRetry = vi.fn();
    render(<CreditOperationsPanel data={null} phase="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
