// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { UserAnalyticsPanel } from "./UserAnalyticsPanel";
import type { OpsUserSummary } from "./userService";

afterEach(() => cleanup());

const SUMMARY: OpsUserSummary = {
  total_attempts: 12,
  latest_attempt: {
    id: "a-1",
    exam: { id: "e-1", code: "CTET", name: "CTET Paper I" },
    attempt_type: "full_mock",
    status: "scored",
    total_questions: 50,
    score: "40.00",
    accuracy: "80.00",
    created_at: "2026-06-01T10:00:00Z",
    submitted_at: "2026-06-01T11:00:00Z",
  },
  readiness_score: "66.00",
  current_streak: 5,
};

describe("UserAnalyticsPanel (summary)", () => {
  it("renders a loading state", () => {
    render(<UserAnalyticsPanel phase="loading" summary={null} />);
    expect(
      screen.getByRole("status", { name: "Loading learning snapshot" }),
    ).toBeTruthy();
  });

  it("shows a fallback note on error", () => {
    render(<UserAnalyticsPanel phase="error" summary={null} />);
    expect(screen.getByText(/could not be loaded/i)).toBeTruthy();
  });

  it("renders total attempts, streak, latest attempt and readiness verbatim", () => {
    render(<UserAnalyticsPanel phase="ready" summary={SUMMARY} />);
    expect(screen.getByText("Total attempts")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Current streak")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("CTET Paper I")).toBeTruthy(); // latest attempt exam
    expect(screen.getByText("66")).toBeTruthy(); // readiness normalized
  });

  it('shows "No readiness data" when readiness is null', () => {
    render(
      <UserAnalyticsPanel
        phase="ready"
        summary={{ ...SUMMARY, readiness_score: null }}
      />,
    );
    expect(screen.getByText("No readiness data")).toBeTruthy();
  });

  it('shows "None" when there is no latest attempt', () => {
    render(
      <UserAnalyticsPanel
        phase="ready"
        summary={{ ...SUMMARY, latest_attempt: null }}
      />,
    );
    expect(screen.getByText("None")).toBeTruthy();
  });
});
