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
import { TopicMasteryDashboard } from "./TopicMasteryDashboard";

const spies = vi.hoisted(() => ({
  getTopicPerformance: vi.fn(),
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
vi.mock("@/features/topic-mastery/topicMasteryService", () => ({
  getTopicPerformance: spies.getTopicPerformance,
}));

const TOPICS = [
  {
    topic_id: "t1",
    topic_name: "Fractions",
    attempts: 10,
    correct: 4,
    success_rate: "40.00",
    avg_time: "30.00",
    last_practiced_at: "2026-06-01T00:00:00Z",
  },
  {
    topic_id: "t2",
    topic_name: "Cells",
    attempts: 5,
    correct: 4,
    success_rate: "80.00",
    avg_time: "25.00",
    last_practiced_at: "2026-06-10T00:00:00Z",
  },
];

afterEach(() => cleanup());
beforeEach(() => {
  spies.getTopicPerformance.mockReset();
  spies.toast.mockReset();
  spies.user = { target_exam_id: "exam-1" };
  spies.authLoading = false;
});

describe("TopicMasteryDashboard", () => {
  it("shows the T03 skeleton while loading", () => {
    spies.getTopicPerformance.mockReturnValue(new Promise(() => {}));
    render(<TopicMasteryDashboard />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows the no-exam empty state and fetches nothing", async () => {
    spies.user = { target_exam_id: null };
    render(<TopicMasteryDashboard />);
    await screen.findByText("no_exam_title");
    expect(spies.getTopicPerformance).not.toHaveBeenCalled();
  });

  it("shows the empty state when there are no topics", async () => {
    spies.getTopicPerformance.mockResolvedValue([]);
    render(<TopicMasteryDashboard />);
    await screen.findByText("empty_title");
  });

  it("renders the mastery list when ready", async () => {
    spies.getTopicPerformance.mockResolvedValue(TOPICS);
    render(<TopicMasteryDashboard />);
    await screen.findByText("title");
    expect(screen.getByText("Fractions")).toBeTruthy();
    expect(screen.getByText("Cells")).toBeTruthy();
    expect(screen.getByText("80.00%")).toBeTruthy();
    expect(spies.getTopicPerformance).toHaveBeenCalledWith("exam-1");
  });

  it("shows an error state + toast and retries on demand", async () => {
    spies.getTopicPerformance.mockRejectedValueOnce(new ApiError(500, {}));
    render(<TopicMasteryDashboard />);
    await screen.findByText("error_title");
    expect(spies.toast).toHaveBeenCalled();

    spies.getTopicPerformance.mockResolvedValueOnce(TOPICS);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await screen.findByText("Fractions");
  });
});
