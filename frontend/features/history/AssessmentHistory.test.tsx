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
import { AssessmentHistory } from "./AssessmentHistory";

const spies = vi.hoisted(() => ({
  listScoredAttempts: vi.fn(),
  getHistoryDashboard: vi.fn(),
  toast: vi.fn(),
  user: { target_exam_id: "exam-1" } as { target_exam_id: string | null } | null,
  authLoading: false,
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
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: spies.user, isLoading: spies.authLoading }),
}));
vi.mock("@/features/feedback/useToast", () => ({ toast: spies.toast }));
vi.mock("@/features/history/historyService", () => ({
  listScoredAttempts: spies.listScoredAttempts,
  getHistoryDashboard: spies.getHistoryDashboard,
}));

const ATTEMPTS = [
  {
    id: "att-1",
    attempt_type: "full_mock",
    score: "30.00",
    max_score: "50.00",
    correct: 30,
    incorrect: 20,
    accuracy: "60.00",
    created_at: "2026-06-01T00:00:00Z",
    submitted_at: "2026-06-01T01:00:00Z",
    status: "scored",
  },
];

const DASHBOARD = {
  streak: 0,
  daily_questions_attempted: 0,
  daily_target: 10,
  overall_accuracy: "60.00",
  recent_activity: [
    {
      id: "att-1",
      attempt_type: "full_mock",
      score: "30.00",
      max_score: "50.00",
      correct: 30,
      incorrect: 20,
      accuracy: "60.00",
      created_at: "2026-06-01T00:00:00Z",
    },
  ],
  weak_topics: [
    { topic_id: "w1", topic_name: "Fractions", accuracy: "40.00", severity: 3, status: "active" },
  ],
  recommendations: [
    {
      topic_id: "w1",
      topic_name: "Fractions",
      subject_name: "Mathematics",
      accuracy: "40.00",
      severity: 3,
      recommended_action: "Practice Mathematics Fractions",
    },
  ],
};

afterEach(() => cleanup());
beforeEach(() => {
  spies.listScoredAttempts.mockReset();
  spies.getHistoryDashboard.mockReset();
  spies.toast.mockReset();
  spies.user = { target_exam_id: "exam-1" };
  spies.authLoading = false;
});

describe("AssessmentHistory", () => {
  it("shows the T03 skeleton while loading", () => {
    spies.listScoredAttempts.mockReturnValue(new Promise(() => {}));
    spies.getHistoryDashboard.mockReturnValue(new Promise(() => {}));
    render(<AssessmentHistory />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows the no-exam empty state and fetches nothing", async () => {
    spies.user = { target_exam_id: null };
    render(<AssessmentHistory />);
    await screen.findByText("no_exam_title");
    expect(spies.listScoredAttempts).not.toHaveBeenCalled();
  });

  it("renders the three sections with drill-down links when ready", async () => {
    spies.listScoredAttempts.mockResolvedValue(ATTEMPTS);
    spies.getHistoryDashboard.mockResolvedValue(DASHBOARD);
    render(<AssessmentHistory />);

    await screen.findByText("history_title"); // A
    expect(screen.getByText("recent_title")).toBeTruthy(); // D
    expect(screen.getByText("weak_title")).toBeTruthy(); // C
    // A: row links to the per-attempt deep dive
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/history/att-1");
    // C: weak topic + its recommendation action surface
    expect(screen.getByText("Fractions")).toBeTruthy();
    expect(screen.getByText("Practice Mathematics Fractions")).toBeTruthy();
  });

  it("shows an error state + toast and retries", async () => {
    spies.listScoredAttempts.mockRejectedValueOnce(new ApiError(500, {}));
    spies.getHistoryDashboard.mockResolvedValue(DASHBOARD);
    render(<AssessmentHistory />);

    await screen.findByText("error_title");
    expect(spies.toast).toHaveBeenCalled();

    spies.listScoredAttempts.mockResolvedValueOnce(ATTEMPTS);
    spies.getHistoryDashboard.mockResolvedValueOnce(DASHBOARD);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await screen.findByText("history_title");
  });
});
