// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ReviewQueueColumn } from "./ReviewQueueColumn";
import type { ContentQuestion } from "../content/contentService";
import type { ReviewColumnDef } from "./reviewQueueService";

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

const STATUS_COL: ReviewColumnDef = {
  key: "in_review",
  title: "In Review",
  reviewStatus: "in_review",
};
const AWAITING_COL: ReviewColumnDef = {
  key: "my_queue",
  title: "My Queue",
  awaiting: true,
  note: "Claim ownership is not exposed by the API.",
};

function baseProps(over: Partial<React.ComponentProps<typeof ReviewQueueColumn>> = {}) {
  return {
    column: STATUS_COL,
    phase: "ready" as const,
    questions: [makeQuestion()],
    examNameIndex: { "exam-1": "CTET" },
    subtopicIndex: {},
    onOpen: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
}

describe("ReviewQueueColumn", () => {
  it("is a labelled region with a count badge", () => {
    render(<ReviewQueueColumn {...baseProps()} />);
    expect(screen.getByRole("region", { name: "In Review" })).toBeTruthy();
    expect(screen.getByLabelText("1 item")).toBeTruthy();
  });

  it("renders a loading state", () => {
    render(<ReviewQueueColumn {...baseProps({ phase: "loading", questions: [] })} />);
    expect(screen.getByRole("status", { name: "Loading In Review" })).toBeTruthy();
  });

  it("renders an error state with a working Retry", () => {
    const props = baseProps({ phase: "error", questions: [] });
    render(<ReviewQueueColumn {...props} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("renders an empty state", () => {
    render(<ReviewQueueColumn {...baseProps({ questions: [] })} />);
    expect(screen.getByText("No questions")).toBeTruthy();
  });

  it("renders cards for a ready column", () => {
    render(<ReviewQueueColumn {...baseProps()} />);
    expect(screen.getByRole("button", { name: /open question/i })).toBeTruthy();
  });

  it("renders an awaiting-backend column with a note and no data/count", () => {
    render(
      <ReviewQueueColumn
        {...baseProps({ column: AWAITING_COL, phase: "loading", questions: [] })}
      />,
    );
    expect(screen.getByText(/claim ownership is not exposed/i)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByLabelText(/item/)).toBeNull();
  });
});
