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
import { ReviewDetailPage } from "./ReviewDetailPage";

const spies = vi.hoisted(() => ({
  getReviewQuestion: vi.fn(),
  getQuestionReviews: vi.fn(),
  getExamTree: vi.fn(),
  claimQuestion: vi.fn(),
  releaseQuestion: vi.fn(),
  approveQuestion: vi.fn(),
  rejectQuestion: vi.fn(),
  escalateQuestion: vi.fn(),
  notifyError: vi.fn(),
  user: { id: "user-1" } as { id: string } | null,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: spies.user, isLoading: false }),
}));
vi.mock("@/features/feedback/useErrorToast", () => ({
  useErrorToast: () => spies.notifyError,
}));
vi.mock("@/features/feedback/useToast", () => ({ toast: vi.fn() }));
vi.mock("./reviewService", async (importActual) => {
  const actual = await importActual<typeof import("./reviewService")>();
  return {
    ...actual, // keep deriveClaimState + buildSubtopicIndex real
    getReviewQuestion: spies.getReviewQuestion,
    getQuestionReviews: spies.getQuestionReviews,
    getExamTree: spies.getExamTree,
    claimQuestion: spies.claimQuestion,
    releaseQuestion: spies.releaseQuestion,
    approveQuestion: spies.approveQuestion,
    rejectQuestion: spies.rejectQuestion,
    escalateQuestion: spies.escalateQuestion,
  };
});

const QUESTION = {
  id: "q-123",
  exam_id: "exam-1",
  subtopic_id: "sub-1",
  stem: "Photosynthesis occurs in which organelle?",
  explanation: "Chloroplasts contain chlorophyll.",
  difficulty: 2,
  language: "en",
  origin: "manual",
  review_status: "in_review",
  options: [
    { id: "o1", label: "A", body: "Chloroplast", is_correct: true, position: 0 },
    { id: "o2", label: "B", body: "Mitochondria", is_correct: false, position: 1 },
  ],
  created_at: "2026-06-01T00:00:00Z",
};

const TREE = {
  id: "exam-1",
  subjects: [
    {
      id: "s1",
      name: "Science",
      topics: [{ id: "t1", name: "Biology", subtopics: [{ id: "sub-1", name: "Cells" }] }],
    },
  ],
};

const claimBy = (actor: string) => [
  { id: 1, action: "claim", actor, actor_name: actor, created_at: "2026-06-03T00:00:00Z" },
];

afterEach(() => cleanup());
beforeEach(() => {
  Object.values(spies).forEach((s) => {
    if (typeof s === "function" && "mockReset" in s) (s as ReturnType<typeof vi.fn>).mockReset();
  });
  spies.user = { id: "user-1" };
  spies.getReviewQuestion.mockResolvedValue(QUESTION);
  spies.getExamTree.mockResolvedValue(TREE);
  spies.getQuestionReviews.mockResolvedValue([]);
  spies.claimQuestion.mockResolvedValue(undefined);
  spies.releaseQuestion.mockResolvedValue(undefined);
  spies.approveQuestion.mockResolvedValue(undefined);
  spies.rejectQuestion.mockResolvedValue(undefined);
  spies.escalateQuestion.mockResolvedValue(undefined);
});

describe("ReviewDetailPage", () => {
  it("shows the loading skeleton", () => {
    spies.getReviewQuestion.mockReturnValue(new Promise(() => {}));
    spies.getQuestionReviews.mockReturnValue(new Promise(() => {}));
    render(<ReviewDetailPage id="q-123" />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("renders the read-only question, options, correct answer, explanation and metadata", async () => {
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("Photosynthesis occurs in which organelle?");
    expect(screen.getByText("Chloroplast")).toBeTruthy();
    expect(screen.getByText("Mitochondria")).toBeTruthy();
    expect(screen.getByText("correct_badge")).toBeTruthy(); // correct option marked
    expect(screen.getByText("Chloroplasts contain chlorophyll.")).toBeTruthy();
    expect(screen.getByText("Biology")).toBeTruthy(); // topic from exam tree
  });

  it("shows Claim for an unclaimed question and calls the API", async () => {
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("claim_status_unclaimed");
    fireEvent.click(screen.getByRole("button", { name: "action_claim" }));
    await waitFor(() => expect(spies.claimQuestion).toHaveBeenCalledWith("q-123"));
  });

  it("shows owner actions when claimed by the current user; Release calls the API", async () => {
    spies.getQuestionReviews.mockResolvedValue(claimBy("user-1"));
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("claim_status_mine");
    expect(screen.getByRole("button", { name: "action_release" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "action_approve" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "action_reject" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "action_escalate" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "action_release" }));
    await waitFor(() => expect(spies.releaseQuestion).toHaveBeenCalledWith("q-123"));
  });

  it("approves via a focus-managed dialog (routes by status)", async () => {
    spies.getQuestionReviews.mockResolvedValue(claimBy("user-1"));
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("claim_status_mine");

    fireEvent.click(screen.getByRole("button", { name: "action_approve" }));
    const dialog = await screen.findByRole("dialog"); // aria-modal dialog
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "approve_confirm" }));
    await waitFor(() =>
      expect(spies.approveQuestion).toHaveBeenCalledWith("q-123", "in_review", ""),
    );
  });

  it("rejects via dialog", async () => {
    spies.getQuestionReviews.mockResolvedValue(claimBy("user-1"));
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("claim_status_mine");

    fireEvent.click(screen.getByRole("button", { name: "action_reject" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "reject_confirm" }));
    await waitFor(() =>
      expect(spies.rejectQuestion).toHaveBeenCalledWith("q-123", ""),
    );
  });

  it("escalates via dialog", async () => {
    spies.getQuestionReviews.mockResolvedValue(claimBy("user-1"));
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("claim_status_mine");

    fireEvent.click(screen.getByRole("button", { name: "action_escalate" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "escalate_confirm" }));
    await waitFor(() =>
      expect(spies.escalateQuestion).toHaveBeenCalledWith("q-123", ""),
    );
  });

  it("is read-only when claimed by another reviewer", async () => {
    spies.getQuestionReviews.mockResolvedValue(claimBy("user-2"));
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("readonly_notice");
    expect(screen.queryByRole("button", { name: "action_claim" })).toBeNull();
    expect(screen.queryByRole("button", { name: "action_approve" })).toBeNull();
  });

  it("shows the not-found state on a 404", async () => {
    spies.getReviewQuestion.mockRejectedValueOnce(new ApiError(404, {}));
    spies.getQuestionReviews.mockRejectedValueOnce(new ApiError(404, {}));
    render(<ReviewDetailPage id="missing" />);
    await screen.findByText("not_found_title");
  });

  it("shows the error state with retry on a server error", async () => {
    spies.getReviewQuestion.mockRejectedValueOnce(new ApiError(500, {}));
    spies.getQuestionReviews.mockRejectedValueOnce(new ApiError(500, {}));
    render(<ReviewDetailPage id="q-123" />);
    await screen.findByText("detail_error_title");
    expect(screen.getByRole("button", { name: "retry" })).toBeTruthy();
    expect(spies.notifyError).toHaveBeenCalled();
  });
});
