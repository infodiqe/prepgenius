// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { CreditSummaryPanel } from "./CreditSummaryPanel";
import type { OpsUserCredits } from "./billingService";

afterEach(() => cleanup());

const CREDITS: OpsUserCredits = {
  balance: "120.00",
  reserved: "30.00",
  lifetime: "200.00",
  recent_ledger: [],
};

describe("CreditSummaryPanel", () => {
  it("renders the three KPI labels", () => {
    render(<CreditSummaryPanel credits={CREDITS} />);
    expect(screen.getByText("Available Credits")).toBeTruthy();
    expect(screen.getByText("Reserved Credits")).toBeTruthy();
    expect(screen.getByText("Lifetime Credits")).toBeTruthy();
  });

  it("shows real API values verbatim", () => {
    render(<CreditSummaryPanel credits={CREDITS} />);
    expect(screen.getByText("120.00")).toBeTruthy();
    expect(screen.getByText("30.00")).toBeTruthy();
    expect(screen.getByText("200.00")).toBeTruthy();
  });

  it("shows dashes when no user is selected", () => {
    render(<CreditSummaryPanel credits={null} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("renders a loading state", () => {
    render(<CreditSummaryPanel credits={null} loading />);
    expect(
      screen.getByRole("status", { name: "Loading credit summary" }),
    ).toBeTruthy();
  });
});
