// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { ReviewOperationsPanel } from "./ReviewOperationsPanel";
import type { OpsReviewAnalytics } from "./analyticsService";

afterEach(() => cleanup());

const data: OpsReviewAnalytics = {
  claimed: 7,
  unclaimed: 3,
  escalated: 2,
  approved_today: 9,
  rejected_today: 1,
};

describe("ReviewOperationsPanel (Part D — review counts)", () => {
  it("renders the five review metrics verbatim", () => {
    render(<ReviewOperationsPanel data={data} phase="ready" />);
    expect(screen.getByRole("region", { name: "Review operations" })).toBeTruthy();
    for (const [label, value] of [
      ["Claimed", "7"],
      ["Unclaimed", "3"],
      ["Escalated", "2"],
      ["Approved today", "9"],
      ["Rejected today", "1"],
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByText(value)).toBeTruthy();
    }
  });

  it("shows a loading state", () => {
    render(<ReviewOperationsPanel data={null} phase="loading" />);
    expect(
      screen.getByRole("status", { name: "Loading review operations" }),
    ).toBeTruthy();
  });

  it("shows a forbidden state", () => {
    render(<ReviewOperationsPanel data={null} phase="forbidden" />);
    expect(screen.getByText("Access denied")).toBeTruthy();
  });
});
