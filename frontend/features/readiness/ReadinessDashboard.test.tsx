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
import { ReadinessDashboard } from "./ReadinessDashboard";

const spies = vi.hoisted(() => ({
  getReadinessDashboard: vi.fn(),
  getAttemptSubjectAnalytics: vi.fn(),
  getReadiness: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  user: { target_exam_id: "exam-1" } as { target_exam_id: string | null } | null,
  authLoading: false,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: spies.push }),
}));
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: spies.user, isLoading: spies.authLoading }),
}));
vi.mock("@/features/feedback/useToast", () => ({
  toast: spies.toast,
}));
vi.mock("@/features/readiness/readinessService", () => ({
  getReadinessDashboard: spies.getReadinessDashboard,
  getAttemptSubjectAnalytics: spies.getAttemptSubjectAnalytics,
  getReadiness: spies.getReadiness,
}));

const READINESS_SCORED = {
  status: "scored",
  score: "75.00",
  band: "on_track",
  computed_at: "2026-06-19T10:00:00Z",
  components: {
    status: "scored",
    band: "on_track",
    scores: {
      mock_performance: 80,
      subject_accuracy: 70,
      topic_accuracy: 65,
      consistency: 40,
      practice_completion: 55,
    },
  },
};

const READINESS_PROVISIONAL = {
  status: "provisional",
  score: null,
  band: "provisional",
  computed_at: null,
  components: {},
};

const DASHBOARD = {
  streak: 0,
  daily_questions_attempted: 0,
  daily_target: 10,
  overall_accuracy: "50.00",
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
    { topic_id: "w2", topic_name: "Cells", accuracy: "50.00", severity: 1, status: "active" },
  ],
  recommendations: [
    {
      topic_id: "r1",
      topic_name: "Fractions",
      subject_name: "Mathematics",
      accuracy: "40.00",
      severity: 3,
      recommended_action: "Practice Mathematics Fractions",
    },
  ],
};

const SUBJECTS = {
  attempt_id: "att-1",
  subjects: [
    { id: "s1", scope_id: "sc1", name: "Science", total: 10, correct: 6, accuracy: "60.00", avg_time: "30.00" },
  ],
  topics: [],
};

afterEach(() => cleanup());
beforeEach(() => {
  spies.getReadinessDashboard.mockReset();
  spies.getAttemptSubjectAnalytics.mockReset();
  spies.getReadiness.mockReset();
  spies.push.mockReset();
  spies.toast.mockReset();
  spies.user = { target_exam_id: "exam-1" };
  spies.authLoading = false;
});

describe("ReadinessDashboard — loading", () => {
  it("shows the T03 skeleton while loading", () => {
    spies.getReadiness.mockReturnValue(new Promise(() => {}));
    spies.getReadinessDashboard.mockReturnValue(new Promise(() => {}));
    render(<ReadinessDashboard />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("ReadinessDashboard — no target exam", () => {
  it("shows the select-exam empty state and fetches nothing", async () => {
    spies.user = { target_exam_id: null };
    render(<ReadinessDashboard />);
    await screen.findByText("no_exam_title");
    expect(spies.getReadinessDashboard).not.toHaveBeenCalled();
  });
});

describe("ReadinessDashboard — ready", () => {
  it("renders all four sections from existing analytics data", async () => {
    spies.getReadiness.mockResolvedValue(READINESS_SCORED);
    spies.getReadinessDashboard.mockResolvedValue(DASHBOARD);
    spies.getAttemptSubjectAnalytics.mockResolvedValue(SUBJECTS);
    render(<ReadinessDashboard />);

    await screen.findByText("title");
    // A: real readiness score + band (from GET /analytics/readiness/)
    expect(screen.getByText("score_title")).toBeTruthy();
    expect(screen.getByText("75.00%")).toBeTruthy();
    expect(screen.getByText("band_on_track")).toBeTruthy();
    // B: subject from latest attempt analytics
    expect(screen.getByText("Science")).toBeTruthy();
    // C: weak topics
    expect(screen.getByText("Fractions")).toBeTruthy();
    expect(screen.getByText("Cells")).toBeTruthy();
    // D: recommendation (backend-provided action)
    expect(screen.getByText("Practice Mathematics Fractions")).toBeTruthy();
    expect(spies.getReadiness).toHaveBeenCalledWith("exam-1");
    expect(spies.getAttemptSubjectAnalytics).toHaveBeenCalledWith("att-1");
  });

  it("renders the provisional readiness card from the backend response", async () => {
    spies.getReadiness.mockResolvedValue(READINESS_PROVISIONAL);
    spies.getReadinessDashboard.mockResolvedValue(DASHBOARD);
    spies.getAttemptSubjectAnalytics.mockResolvedValue(SUBJECTS);
    render(<ReadinessDashboard />);

    await screen.findByText("title");
    expect(screen.getByText("score_provisional")).toBeTruthy();
    // Other sections still render.
    expect(screen.getByText("Fractions")).toBeTruthy();
  });

  it("degrades subject section gracefully when per-attempt analytics fails", async () => {
    spies.getReadiness.mockResolvedValue(READINESS_SCORED);
    spies.getReadinessDashboard.mockResolvedValue(DASHBOARD);
    spies.getAttemptSubjectAnalytics.mockRejectedValue(new ApiError(500, {}));
    render(<ReadinessDashboard />);

    await screen.findByText("title");
    // Subject section shows its own empty state; the page still renders.
    expect(screen.getByText("subjects_empty_title")).toBeTruthy();
    expect(screen.getByText("Fractions")).toBeTruthy(); // weak topics still render
    expect(spies.push).not.toHaveBeenCalled();
  });
});

describe("ReadinessDashboard — error", () => {
  it("shows an error state + toast and retries on demand", async () => {
    spies.getReadiness.mockResolvedValue(READINESS_SCORED);
    spies.getReadinessDashboard.mockRejectedValueOnce(new ApiError(500, {}));
    render(<ReadinessDashboard />);

    await screen.findByText("error_title");
    expect(spies.toast).toHaveBeenCalled();

    spies.getReadinessDashboard.mockResolvedValueOnce(DASHBOARD);
    spies.getAttemptSubjectAnalytics.mockResolvedValueOnce(SUBJECTS);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await screen.findByText("score_title");
  });

  it("surfaces the error+retry state when the readiness fetch fails", async () => {
    spies.getReadiness.mockRejectedValueOnce(new ApiError(500, {}));
    spies.getReadinessDashboard.mockResolvedValue(DASHBOARD);
    render(<ReadinessDashboard />);

    await screen.findByText("error_title");
    expect(spies.toast).toHaveBeenCalled();
  });
});
