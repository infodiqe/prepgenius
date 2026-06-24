// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ReviewQueueWorkspace } from "./ReviewQueueWorkspace";
import type {
  ContentQuestion,
  ContentReviewStatus,
} from "../content/contentService";

/**
 * OPS-STAB-01 §3.1 — reviewer stays in flow: a decision removes the card,
 * keeps the drawer open, and advances to the next card.
 */

function q(id: string, stem: string): ContentQuestion {
  return {
    id,
    exam_id: "exam-1",
    subtopic_id: "sub-1",
    stem,
    explanation: "",
    difficulty: 2,
    language: "en",
    origin: "ai",
    review_status: "in_review",
    verified_by_id: null,
    tags: {},
    options: [],
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
  } as ContentQuestion;
}

// Mutable server store the mocked endpoints read from, so the silent background
// reconcile after an action returns the post-transition truth.
const store: Record<string, ContentQuestion[]> = {
  in_review: [],
  sme_review: [],
  approved: [],
  rejected: [],
};

const approveQuestion = vi.fn(async (id: string) => {
  store.in_review = store.in_review.filter((x) => x.id !== id);
});

vi.mock("../content/contentService", async (orig) => {
  const actual = await orig<typeof import("../content/contentService")>();
  return {
    ...actual,
    listExams: vi.fn(async () => []),
    getExamTree: vi.fn(async () => ({
      id: "exam-1",
      code: "E1",
      name: "Exam 1",
      subjects: [],
    })),
    listQuestions: vi.fn(
      async (p: { reviewStatus?: ContentReviewStatus }) =>
        store[p.reviewStatus ?? "in_review"] ?? [],
    ),
  };
});

vi.mock("./reviewQueueService", async (orig) => {
  const actual = await orig<typeof import("./reviewQueueService")>();
  return {
    ...actual,
    approveQuestion: (id: string) => approveQuestion(id),
    rejectQuestion: vi.fn(async () => {}),
    escalateQuestion: vi.fn(async () => {}),
    claimQuestion: vi.fn(async () => {}),
    releaseQuestion: vi.fn(async () => {}),
  };
});

beforeEach(() => {
  store.in_review = [q("q1", "Capital of Assam"), q("q2", "Largest river")];
  store.sme_review = [];
  store.approved = [];
  store.rejected = [];
  approveQuestion.mockClear();
});

afterEach(() => cleanup());

describe("ReviewQueueWorkspace — in-flow auto-advance", () => {
  it("removes the decided card, keeps the drawer open, and advances to the next", async () => {
    render(<ReviewQueueWorkspace />);

    // Open the first in-review card.
    const firstCard = await screen.findByRole("button", {
      name: /Open question q1/i,
    });
    fireEvent.click(firstCard);

    // Drawer is open on q1.
    const drawer = await screen.findByLabelText("Review question");
    expect(within(drawer).getByText("Capital of Assam")).toBeTruthy();

    // Approve (no reason required).
    fireEvent.click(within(drawer).getByRole("button", { name: /Approve/ }));

    await waitFor(() =>
      expect(approveQuestion).toHaveBeenCalledWith("q1"),
    );

    // Drawer stays open and now shows the next card (q2); q1 is gone.
    await waitFor(() => {
      const d = screen.getByLabelText("Review question");
      expect(within(d).getByText("Largest river")).toBeTruthy();
    });
    expect(screen.getByLabelText("Review question")).toBeTruthy();
    expect(screen.queryByText("Capital of Assam")).toBeNull();
  });

  it("approves via the 'a' keyboard shortcut too", async () => {
    render(<ReviewQueueWorkspace />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Open question q1/i }),
    );
    await screen.findByLabelText("Review question");
    fireEvent.keyDown(document.body, { key: "a" });
    await waitFor(() => expect(approveQuestion).toHaveBeenCalledWith("q1"));
  });
});
