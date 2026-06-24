// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { AnalyticsKpiCards } from "./AnalyticsKpiCards";
import type { OpsOverview } from "./analyticsService";

afterEach(() => cleanup());

const overview: OpsOverview = {
  total_users: 120,
  active_users_30d: 45,
  total_attempts: 980,
  total_questions: 1500,
  approved_questions: 870,
  published_pages: 12,
  available_credits: "100.00",
  reserved_credits: "20.50",
};

describe("AnalyticsKpiCards (Part A — overview)", () => {
  it("renders all eight platform KPIs verbatim", () => {
    render(<AnalyticsKpiCards overview={overview} phase="ready" />);
    for (const [label, value] of [
      ["Total users", "120"],
      ["Active users", "45"],
      ["Total attempts", "980"],
      ["Total questions", "1500"],
      ["Approved questions", "870"],
      ["Published pages", "12"],
      ["Available credits", "100.00"],
      ["Reserved credits", "20.50"],
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByText(value)).toBeTruthy();
    }
  });

  it("shows a loading state", () => {
    render(<AnalyticsKpiCards overview={null} phase="loading" />);
    expect(screen.getByRole("status", { name: "Loading overview" })).toBeTruthy();
  });

  it("shows a forbidden state", () => {
    render(<AnalyticsKpiCards overview={null} phase="forbidden" />);
    expect(screen.getByText("Access denied")).toBeTruthy();
  });
});
