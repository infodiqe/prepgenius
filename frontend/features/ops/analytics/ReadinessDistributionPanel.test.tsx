// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { ReadinessDistributionPanel } from "./ReadinessDistributionPanel";
import type { OpsReadinessDistribution } from "./analyticsService";

afterEach(() => cleanup());

const data: OpsReadinessDistribution = {
  bands: [
    { label: "0-20", count: 1 },
    { label: "21-40", count: 2 },
    { label: "41-60", count: 3 },
    { label: "61-80", count: 4 },
    { label: "81-100", count: 5 },
  ],
  total: 15,
};

describe("ReadinessDistributionPanel (Part B — bands table)", () => {
  it("renders an accessible table of bands + counts and a total", () => {
    render(<ReadinessDistributionPanel data={data} phase="ready" />);
    const table = screen.getByRole("table");
    expect(screen.getByRole("columnheader", { name: "Readiness band" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Learners" })).toBeTruthy();
    for (const band of ["0-20", "21-40", "41-60", "61-80", "81-100"]) {
      expect(within(table).getByText(band)).toBeTruthy();
    }
    expect(screen.getByText("Total")).toBeTruthy();
    expect(within(table).getByText("15")).toBeTruthy();
  });

  it("notes when there are no readiness scores yet", () => {
    render(
      <ReadinessDistributionPanel
        data={{ bands: data.bands.map((b) => ({ ...b, count: 0 })), total: 0 }}
        phase="ready"
      />,
    );
    expect(screen.getByText(/no readiness scores/i)).toBeTruthy();
  });

  it("shows a loading state", () => {
    render(<ReadinessDistributionPanel data={null} phase="loading" />);
    expect(
      screen.getByRole("status", { name: "Loading readiness distribution" }),
    ).toBeTruthy();
  });

  it("shows an error state with a working Retry", () => {
    const onRetry = vi.fn();
    render(
      <ReadinessDistributionPanel data={null} phase="error" onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows a forbidden state", () => {
    render(<ReadinessDistributionPanel data={null} phase="forbidden" />);
    expect(screen.getByText("Access denied")).toBeTruthy();
  });
});
