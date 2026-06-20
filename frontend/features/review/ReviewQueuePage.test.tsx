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
import { ReviewQueuePage } from "./ReviewQueuePage";

const spies = vi.hoisted(() => ({
  listReviewQuestions: vi.fn(),
  getExamTree: vi.fn(),
  notifyError: vi.fn(),
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
vi.mock("@/features/feedback/useErrorToast", () => ({
  useErrorToast: () => spies.notifyError,
}));
vi.mock("@/features/feedback/useToast", () => ({ toast: vi.fn() }));
vi.mock("./reviewService", async (importActual) => {
  const actual = await importActual<typeof import("./reviewService")>();
  return {
    ...actual, // keep buildSubtopicIndex real
    listReviewQuestions: spies.listReviewQuestions,
    getExamTree: spies.getExamTree,
  };
});

const QUESTIONS = [
  {
    id: "11111111-aaaa",
    exam_id: "exam-1",
    subtopic_id: "sub-1",
    stem: "Photosynthesis occurs in which organelle?",
    review_status: "in_review",
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "22222222-bbbb",
    exam_id: "exam-1",
    subtopic_id: "sub-2",
    stem: "What is 2 + 2?",
    review_status: "draft",
    created_at: "2026-06-02T00:00:00Z",
  },
];

const TREE = {
  id: "exam-1",
  subjects: [
    {
      id: "subj-1",
      name: "Science",
      topics: [
        { id: "top-1", name: "Biology", subtopics: [{ id: "sub-1", name: "Cells" }] },
      ],
    },
    {
      id: "subj-2",
      name: "Mathematics",
      topics: [
        { id: "top-2", name: "Arithmetic", subtopics: [{ id: "sub-2", name: "Addition" }] },
      ],
    },
  ],
};

afterEach(() => cleanup());
beforeEach(() => {
  spies.listReviewQuestions.mockReset();
  spies.getExamTree.mockReset();
  spies.notifyError.mockReset();
  spies.getExamTree.mockResolvedValue(TREE);
});

describe("ReviewQueuePage", () => {
  it("shows the T03 skeleton while loading", () => {
    spies.listReviewQuestions.mockReturnValue(new Promise(() => {}));
    render(<ReviewQueuePage />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows the empty state when there are no questions", async () => {
    spies.listReviewQuestions.mockResolvedValue([]);
    render(<ReviewQueuePage />);
    await screen.findByText("empty_title");
    expect(spies.getExamTree).not.toHaveBeenCalled();
  });

  it("shows an error state with retry and notifies", async () => {
    spies.listReviewQuestions.mockRejectedValueOnce(new ApiError(500, {}));
    render(<ReviewQueuePage />);
    await screen.findByText("error_title");
    expect(spies.notifyError).toHaveBeenCalled();

    spies.listReviewQuestions.mockResolvedValueOnce(QUESTIONS);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await screen.findByRole("table");
  });

  it("renders the queue table with resolved subject/topic names", async () => {
    spies.listReviewQuestions.mockResolvedValue(QUESTIONS);
    render(<ReviewQueuePage />);

    await screen.findByRole("table");
    expect(screen.getByText("Photosynthesis occurs in which organelle?")).toBeTruthy();
    expect(screen.getByText("Biology")).toBeTruthy(); // topic resolved via exam tree
    expect(screen.getByText("Science")).toBeTruthy(); // subject resolved
    // column headers present (semantic table)
    expect(screen.getAllByRole("columnheader").length).toBeGreaterThanOrEqual(7);
  });

  it("filters by status and searches by text", async () => {
    spies.listReviewQuestions.mockResolvedValue(QUESTIONS);
    render(<ReviewQueuePage />);
    await screen.findByRole("table");

    // Filter to draft → only the maths question remains.
    fireEvent.click(screen.getByRole("button", { name: "status_draft" }));
    expect(screen.queryByText("Photosynthesis occurs in which organelle?")).toBeNull();
    expect(screen.getByText("What is 2 + 2?")).toBeTruthy();

    // Back to all, then search by text.
    fireEvent.click(screen.getByRole("button", { name: "filter_all" }));
    fireEvent.change(screen.getByLabelText("search_label"), {
      target: { value: "photosynthesis" },
    });
    expect(screen.getByText("Photosynthesis occurs in which organelle?")).toBeTruthy();
    expect(screen.queryByText("What is 2 + 2?")).toBeNull();
  });
});
