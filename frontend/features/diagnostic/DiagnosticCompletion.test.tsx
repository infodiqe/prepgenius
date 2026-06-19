// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { ApiError } from "@/lib/errors";
import { DiagnosticCompletion } from "./DiagnosticCompletion";

const spies = vi.hoisted(() => ({
  getAttemptDetails: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: spies.push }),
}));
vi.mock("@/features/attempts/attemptService", () => ({
  getAttemptDetails: spies.getAttemptDetails,
}));
vi.mock("@/features/feedback/useToast", () => ({
  toast: spies.toast,
}));

const ATTEMPT_ID = "att-1";

const SCORED = {
  id: ATTEMPT_ID,
  status: "scored",
  score: "45.00",
  max_score: "60.00",
  accuracy: "75.00",
  total_questions: 60,
  correct: 45,
};

const PENDING = {
  id: ATTEMPT_ID,
  status: "submitted",
  score: null,
  max_score: null,
  accuracy: null,
  total_questions: 60,
  correct: 0,
};

afterEach(() => cleanup());
beforeEach(() => {
  spies.getAttemptDetails.mockReset();
  spies.push.mockReset();
  spies.toast.mockReset();
});

function renderCompletion() {
  return render(<DiagnosticCompletion attemptId={ATTEMPT_ID} />);
}

describe("DiagnosticCompletion — scored state", () => {
  it("renders the score, accuracy, total and correct, and a success toast", async () => {
    spies.getAttemptDetails.mockResolvedValue(SCORED);
    renderCompletion();

    await screen.findByText("title_scored");
    expect(screen.getByText("45.00 / 60.00")).toBeTruthy();
    expect(screen.getByText("75.00%")).toBeTruthy();
    expect(screen.getByText("60")).toBeTruthy();
    expect(screen.getByText("45")).toBeTruthy();
    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "scored_success",
    });
  });

  it("navigates to the full results page", async () => {
    spies.getAttemptDetails.mockResolvedValue(SCORED);
    renderCompletion();
    await screen.findByText("title_scored");

    fireEvent.click(screen.getByRole("button", { name: "view_results" }));
    expect(spies.push).toHaveBeenCalledWith(`/results/${ATTEMPT_ID}`);
  });

  it("navigates to the dashboard", async () => {
    spies.getAttemptDetails.mockResolvedValue(SCORED);
    renderCompletion();
    await screen.findByText("title_scored");

    fireEvent.click(screen.getByRole("button", { name: "go_dashboard" }));
    expect(spies.push).toHaveBeenCalledWith("/dashboard");
  });

  it("moves focus to the resolved heading (a11y)", async () => {
    spies.getAttemptDetails.mockResolvedValue(SCORED);
    renderCompletion();
    await screen.findByText("title_scored");
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe("title_scored"),
    );
  });

  it("uses full-width CTAs for mobile", async () => {
    spies.getAttemptDetails.mockResolvedValue(SCORED);
    renderCompletion();
    await screen.findByText("title_scored");
    const results = screen.getByRole("button", { name: "view_results" });
    expect(results.className).toContain("w-full");
  });
});

describe("DiagnosticCompletion — pending state", () => {
  it("shows the scoring-in-progress state with a refresh action", async () => {
    spies.getAttemptDetails.mockResolvedValue(PENDING);
    renderCompletion();

    await screen.findByText("title_pending");
    expect(screen.getByRole("button", { name: "refresh" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "go_dashboard" })).toBeTruthy();
    // No success toast while pending.
    expect(spies.toast).not.toHaveBeenCalled();
  });

  it("refreshes and transitions to scored when scoring completes", async () => {
    spies.getAttemptDetails
      .mockResolvedValueOnce(PENDING)
      .mockResolvedValueOnce(SCORED);
    renderCompletion();

    await screen.findByText("title_pending");
    fireEvent.click(screen.getByRole("button", { name: "refresh" }));

    await screen.findByText("title_scored");
    expect(spies.getAttemptDetails).toHaveBeenCalledTimes(2);
  });

  it("marks the refresh button busy while re-fetching", async () => {
    spies.getAttemptDetails
      .mockResolvedValueOnce(PENDING)
      .mockReturnValueOnce(new Promise(() => {}));
    renderCompletion();

    await screen.findByText("title_pending");
    fireEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "refreshing" });
      expect(btn.getAttribute("aria-busy")).toBe("true");
    });
  });
});

describe("DiagnosticCompletion — loading state", () => {
  it("shows a busy skeleton region before the fetch resolves", () => {
    spies.getAttemptDetails.mockReturnValue(new Promise(() => {}));
    const { container } = renderCompletion();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});

describe("DiagnosticCompletion — error path", () => {
  it("shows the error state + toast, and retries on demand", async () => {
    spies.getAttemptDetails.mockRejectedValueOnce(new ApiError(500, {}));
    renderCompletion();

    await screen.findByText("title_error");
    expect(spies.toast).toHaveBeenCalled();

    // Retry succeeds → scored view.
    spies.getAttemptDetails.mockResolvedValueOnce(SCORED);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await screen.findByText("title_scored");
  });
});
