// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { QuestionDetailDrawer } from "./QuestionDetailDrawer";
import type { ContentQuestion } from "./contentService";

afterEach(() => cleanup());

function makeQuestion(over: Partial<ContentQuestion> = {}): ContentQuestion {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    exam_id: "exam-1",
    subtopic_id: "sub-1",
    stem: "What is the capital of Assam?",
    explanation: "Dispur is the capital.",
    difficulty: 2,
    language: "en",
    origin: "official",
    review_status: "approved",
    verified_by_id: "user-9",
    tags: {},
    options: [
      { id: "o1", label: "A", body: "Guwahati", is_correct: false, position: 0 },
      { id: "o2", label: "B", body: "Dispur", is_correct: true, position: 1 },
    ],
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    ...over,
  } as ContentQuestion;
}

function open(extra: Partial<React.ComponentProps<typeof QuestionDetailDrawer>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    question: makeQuestion(),
    examName: "CTET",
    subject: "GK",
    topic: "Geography",
    ...extra,
  };
  return { props, ...render(<QuestionDetailDrawer {...props} />) };
}

describe("QuestionDetailDrawer (read-only)", () => {
  it("renders nothing when closed", () => {
    render(
      <QuestionDetailDrawer open={false} onOpenChange={() => {}} question={makeQuestion()} />,
    );
    expect(screen.queryByText("Question details")).toBeNull();
  });

  it("shows the full question, options, correct answer and explanation", () => {
    open();
    expect(screen.getByText("Question details")).toBeTruthy();
    expect(screen.getByText("What is the capital of Assam?")).toBeTruthy();
    expect(screen.getByText("Guwahati")).toBeTruthy();
    expect(screen.getByText("Dispur")).toBeTruthy();
    expect(screen.getByText("Correct")).toBeTruthy();
    expect(screen.getByText("Dispur is the capital.")).toBeTruthy();
  });

  it("shows API-exposed metadata (exam/subject/topic/status/verified-by) but NOT 'Created By'", () => {
    open();
    expect(screen.getByText("CTET")).toBeTruthy();
    expect(screen.getByText("GK")).toBeTruthy();
    expect(screen.getByText("Geography")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.getByText("Verified by")).toBeTruthy();
    // "Created By" is intentionally omitted (no author field in the API).
    expect(screen.queryByText(/created by/i)).toBeNull();
  });

  it("exposes NO editing / workflow / approval / publish actions", () => {
    open();
    for (const name of [/edit/i, /approve/i, /publish/i, /reject/i, /save/i]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    // Only the Close action exists.
    expect(screen.getByRole("button", { name: "Close details" })).toBeTruthy();
  });

  it("requests close via the close button", () => {
    const { props } = open();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
