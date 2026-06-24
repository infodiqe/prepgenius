// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { AnalyticsFilters } from "./AnalyticsFilters";

afterEach(() => cleanup());

describe("AnalyticsFilters (Part F — date range only)", () => {
  it("keeps only a disabled Date Range filter with an awaiting note", () => {
    render(<AnalyticsFilters />);
    expect(
      (screen.getByLabelText("Date range") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      screen.getByText(/date-range filtering is awaiting backend support/i),
    ).toBeTruthy();
  });

  it("no longer exposes an exam selector", () => {
    render(<AnalyticsFilters />);
    expect(screen.queryByLabelText("Exam")).toBeNull();
  });
});
