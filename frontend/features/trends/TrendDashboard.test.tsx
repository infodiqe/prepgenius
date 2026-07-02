// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ApiError } from "@/lib/errors";
import { TrendDashboard } from "./TrendDashboard";

const spies = vi.hoisted(() => ({
  getAttemptTrend: vi.fn(),
  getReadinessTrend: vi.fn(),
  getSectionTrend: vi.fn(),
  toast: vi.fn(),
  user: { target_exam_id: "exam-1" } as { target_exam_id: string | null } | null,
  authLoading: false,
}));

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: spies.user, isLoading: spies.authLoading }),
}));
vi.mock("@/features/feedback/useToast", () => ({ toast: spies.toast }));
vi.mock("@/features/trends/trendsService", () => ({
  getAttemptTrend: spies.getAttemptTrend,
  getReadinessTrend: spies.getReadinessTrend,
  getSectionTrend: spies.getSectionTrend,
}));

const ATTEMPTS = [
  {
    attempt_id: "a1",
    created_at: "2026-06-01T00:00:00Z",
    score: "30.00",
    max_score: "50.00",
    accuracy: "60.00",
  },
];
const READINESS = [
  { score: "55.00", band: "developing", computed_at: "2026-06-01T00:00:00Z", components: {} },
  { score: "82.00", band: "exam_ready", computed_at: "2026-06-10T00:00:00Z", components: {} },
];
const SUBJECTS = [
  {
    scope_id: "s1",
    scope_name: "Science",
    history: [{ attempt_id: "a1", created_at: "2026-06-01T00:00:00Z", accuracy: "62.00" }],
  },
];
const TOPICS = [
  {
    scope_id: "t1",
    scope_name: "Fractions",
    history: [{ attempt_id: "a1", created_at: "2026-06-01T00:00:00Z", accuracy: "40.00" }],
  },
];

function mockAll() {
  spies.getAttemptTrend.mockResolvedValue(ATTEMPTS);
  spies.getReadinessTrend.mockResolvedValue(READINESS);
  spies.getSectionTrend.mockImplementation((_examId: string, scope: string) =>
    Promise.resolve(scope === "subject" ? SUBJECTS : TOPICS),
  );
}

afterEach(() => cleanup());
beforeEach(() => {
  spies.getAttemptTrend.mockReset();
  spies.getReadinessTrend.mockReset();
  spies.getSectionTrend.mockReset();
  spies.toast.mockReset();
  spies.user = { target_exam_id: "exam-1" };
  spies.authLoading = false;
});

describe("TrendDashboard", () => {
  it("shows the T03 skeleton while loading", () => {
    spies.getAttemptTrend.mockReturnValue(new Promise(() => {}));
    spies.getReadinessTrend.mockReturnValue(new Promise(() => {}));
    spies.getSectionTrend.mockReturnValue(new Promise(() => {}));
    render(<TrendDashboard />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows the no-exam empty state and fetches nothing", async () => {
    spies.user = { target_exam_id: null };
    render(<TrendDashboard />);
    await screen.findByText("no_exam_title");
    expect(spies.getAttemptTrend).not.toHaveBeenCalled();
  });

  it("shows the empty state when every trend is empty", async () => {
    spies.getAttemptTrend.mockResolvedValue([]);
    spies.getReadinessTrend.mockResolvedValue([]);
    spies.getSectionTrend.mockResolvedValue([]);
    render(<TrendDashboard />);
    await screen.findByText("empty_title");
  });

  it("renders all four sections when ready", async () => {
    mockAll();
    render(<TrendDashboard />);
    await screen.findByText("title");
    // A overall progress table (heading; "overall_title" also appears as the
    // sr-only table caption, so query the heading specifically)
    expect(screen.getByRole("heading", { name: "overall_title" })).toBeTruthy();
    expect(screen.getByText("60.00%")).toBeTruthy();
    // B readiness timeline (band label)
    expect(screen.getByText("readiness_title")).toBeTruthy();
    expect(screen.getByText("band_exam_ready")).toBeTruthy();
    // C subjects + D topics
    expect(screen.getByText("Science")).toBeTruthy();
    expect(screen.getByText("Fractions")).toBeTruthy();
    // both scopes were requested
    expect(spies.getSectionTrend).toHaveBeenCalledWith("exam-1", "subject");
    expect(spies.getSectionTrend).toHaveBeenCalledWith("exam-1", "topic");
  });

  it("shows an error state + toast and retries on demand", async () => {
    spies.getAttemptTrend.mockRejectedValueOnce(new ApiError(500, {}));
    spies.getReadinessTrend.mockResolvedValue(READINESS);
    spies.getSectionTrend.mockResolvedValue(SUBJECTS);
    render(<TrendDashboard />);

    await screen.findByText("error_title");
    expect(spies.toast).toHaveBeenCalled();

    mockAll();
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await screen.findByText("readiness_title");
  });
});
