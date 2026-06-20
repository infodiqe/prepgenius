// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { ApiError } from "@/lib/errors";
import { AttemptDeepDive } from "./AttemptDeepDive";

const spies = vi.hoisted(() => ({
  getAttemptResults: vi.fn(),
  getAttemptAnalytics: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/features/feedback/useToast", () => ({ toast: spies.toast }));
vi.mock("@/features/attempts/attemptService", () => ({
  getAttemptResults: spies.getAttemptResults,
  getAttemptAnalytics: spies.getAttemptAnalytics,
}));

const RESULTS = {
  attempt_id: "att-1",
  score: "30.00",
  max_score: "50.00",
  correct: 30,
  incorrect: 20,
  skipped: 0,
  accuracy: "60.00",
  time_taken_seconds: 1200,
  status: "scored",
  submitted_at: "2026-06-01T01:00:00Z",
  pass_status: "needs-work",
};

const ANALYTICS = {
  attempt_id: "att-1",
  subjects: [
    { id: "s1", scope_id: "sc1", name: "Science", total: 10, correct: 6, accuracy: "60.00", avg_time: "30.00" },
  ],
  topics: [
    { id: "t1", scope_id: "tc1", name: "Fractions", total: 5, correct: 2, accuracy: "40.00", avg_time: "25.00" },
  ],
};

afterEach(() => cleanup());
beforeEach(() => {
  spies.getAttemptResults.mockReset();
  spies.getAttemptAnalytics.mockReset();
  spies.toast.mockReset();
});

describe("AttemptDeepDive — Section B", () => {
  it("shows the skeleton while loading", () => {
    spies.getAttemptResults.mockReturnValue(new Promise(() => {}));
    spies.getAttemptAnalytics.mockReturnValue(new Promise(() => {}));
    render(<AttemptDeepDive attemptId="att-1" />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("renders score summary, subjects and topics from existing endpoints", async () => {
    spies.getAttemptResults.mockResolvedValue(RESULTS);
    spies.getAttemptAnalytics.mockResolvedValue(ANALYTICS);
    render(<AttemptDeepDive attemptId="att-1" />);

    await screen.findByText("detail_title");
    // Score summary (backend values)
    expect(screen.getByText("30.00 / 50.00")).toBeTruthy();
    expect(screen.getByText("60.00%")).toBeTruthy();
    // Subject + topic breakdown
    expect(screen.getByText("subjects_title")).toBeTruthy();
    expect(screen.getByText("Science")).toBeTruthy();
    expect(screen.getByText("topics_title")).toBeTruthy();
    expect(screen.getByText("Fractions")).toBeTruthy();

    expect(spies.getAttemptResults).toHaveBeenCalledWith("att-1");
    expect(spies.getAttemptAnalytics).toHaveBeenCalledWith("att-1");
  });

  it("shows an error state + toast and retries", async () => {
    spies.getAttemptResults.mockRejectedValueOnce(new ApiError(404, {}));
    spies.getAttemptAnalytics.mockResolvedValue(ANALYTICS);
    render(<AttemptDeepDive attemptId="att-1" />);

    await screen.findByText("detail_error_title");
    expect(spies.toast).toHaveBeenCalled();

    spies.getAttemptResults.mockResolvedValueOnce(RESULTS);
    spies.getAttemptAnalytics.mockResolvedValueOnce(ANALYTICS);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await screen.findByText("detail_title");
  });
});
