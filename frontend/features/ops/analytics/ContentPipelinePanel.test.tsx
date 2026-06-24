// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { ContentPipelinePanel } from "./ContentPipelinePanel";
import type { OpsContentDistribution } from "./analyticsService";

afterEach(() => cleanup());

const data: OpsContentDistribution = {
  draft: 5,
  in_review: 4,
  sme_review: 3,
  approved: 2,
  published: 1,
};

describe("ContentPipelinePanel (Part C — content counts)", () => {
  it("renders an accessible table of review-state counts", () => {
    render(<ContentPipelinePanel data={data} phase="ready" />);
    const table = screen.getByRole("table");
    for (const stage of ["Draft", "In Review", "SME Review", "Approved", "Published"]) {
      expect(within(table).getByText(stage)).toBeTruthy();
    }
    expect(within(table).getByText("5")).toBeTruthy();
    expect(within(table).getByText("1")).toBeTruthy();
  });

  it("shows a loading state", () => {
    render(<ContentPipelinePanel data={null} phase="loading" />);
    expect(
      screen.getByRole("status", { name: "Loading content pipeline" }),
    ).toBeTruthy();
  });

  it("shows an error state with a working Retry", () => {
    const onRetry = vi.fn();
    render(<ContentPipelinePanel data={null} phase="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows an unauthorized state", () => {
    render(<ContentPipelinePanel data={null} phase="unauthorized" />);
    expect(screen.getByText("Sign in required")).toBeTruthy();
  });
});
