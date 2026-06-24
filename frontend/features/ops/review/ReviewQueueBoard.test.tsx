// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, screen, within } from "@testing-library/react";
import { ReviewQueueBoard, type BoardColumnState } from "./ReviewQueueBoard";
import { REVIEW_COLUMNS } from "./reviewQueueService";
import type { ContentQuestion } from "../content/contentService";

afterEach(() => cleanup());

function makeQuestion(over: Partial<ContentQuestion> = {}): ContentQuestion {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    exam_id: "exam-1",
    subtopic_id: "sub-1",
    stem: "Stem text",
    explanation: "",
    difficulty: 2,
    language: "en",
    origin: "manual",
    review_status: "in_review",
    verified_by_id: null,
    tags: {},
    options: [],
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    ...over,
  } as ContentQuestion;
}

function buildColumns(): BoardColumnState[] {
  return REVIEW_COLUMNS.map((column) => ({
    column,
    phase: "ready" as const,
    questions:
      column.key === "in_review" ? [makeQuestion()] : ([] as ContentQuestion[]),
  }));
}

describe("ReviewQueueBoard", () => {
  it("renders all six OPS-03 columns as an accessible list", () => {
    render(
      <ReviewQueueBoard
        columns={buildColumns()}
        examNameIndex={{ "exam-1": "CTET" }}
        subtopicIndex={{}}
        onOpen={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    const board = screen.getByRole("list", { name: "Review queue board" });
    expect(within(board).getAllByRole("listitem")).toHaveLength(6);
    for (const title of [
      "My Queue",
      "Unclaimed",
      "In Review",
      "SME Review",
      "Approved Today",
      "Rejected Today",
    ]) {
      expect(screen.getByRole("region", { name: title })).toBeTruthy();
    }
  });

  it("shows awaiting-backend notes for the claim-ownership columns", () => {
    render(
      <ReviewQueueBoard
        columns={buildColumns()}
        examNameIndex={{}}
        subtopicIndex={{}}
        onOpen={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    // My Queue + Unclaimed both note the claim-ownership gap.
    expect(
      screen.getAllByText(/claim ownership is not exposed/i).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders cards in a populated column", () => {
    render(
      <ReviewQueueBoard
        columns={buildColumns()}
        examNameIndex={{ "exam-1": "CTET" }}
        subtopicIndex={{}}
        onOpen={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /open question/i })).toBeTruthy();
  });
});
