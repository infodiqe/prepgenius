// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { QuestionTable } from "./QuestionTable";
import type { ContentQuestion, SubtopicLabel } from "./contentService";

afterEach(() => cleanup());

function makeQuestion(over: Partial<ContentQuestion> = {}): ContentQuestion {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    exam_id: "exam-1",
    subtopic_id: "sub-1",
    stem: "What is 2 + 2?",
    explanation: "Because arithmetic.",
    difficulty: 2,
    language: "en",
    origin: "manual",
    review_status: "draft",
    verified_by_id: null,
    tags: {},
    options: [
      { id: "o1", label: "A", body: "3", is_correct: false, position: 0 },
      { id: "o2", label: "B", body: "4", is_correct: true, position: 1 },
    ],
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    ...over,
  } as ContentQuestion;
}

const EXAM_INDEX = { "exam-1": "CTET" };
const SUBTOPIC_INDEX: Record<string, SubtopicLabel> = {
  "sub-1": { subject: "Maths", topic: "Arithmetic" },
};

function baseProps(over: Partial<React.ComponentProps<typeof QuestionTable>> = {}) {
  return {
    phase: "ready" as const,
    questions: [makeQuestion()],
    examNameIndex: EXAM_INDEX,
    subtopicIndex: SUBTOPIC_INDEX,
    onOpen: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
}

describe("QuestionTable", () => {
  it("shows a loading state", () => {
    render(<QuestionTable {...baseProps({ phase: "loading", questions: [] })} />);
    expect(screen.getByRole("status", { name: "Loading questions" })).toBeTruthy();
  });

  it("shows an error state with a working Retry", () => {
    const props = baseProps({ phase: "error", questions: [] });
    render(<QuestionTable {...props} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("shows an empty state when there are no questions", () => {
    render(<QuestionTable {...baseProps({ questions: [] })} />);
    expect(screen.getByText("No questions found")).toBeTruthy();
  });

  it("renders a table with semantic column headers and resolved labels", () => {
    render(<QuestionTable {...baseProps()} />);
    expect(screen.getByRole("table")).toBeTruthy();
    for (const col of ["Question ID", "Exam", "Subject", "Topic", "Origin", "Status", "Created"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeTruthy();
    }
    expect(screen.getByText("What is 2 + 2?")).toBeTruthy();
    expect(screen.getByText("CTET")).toBeTruthy();
    expect(screen.getByText("Maths")).toBeTruthy();
    expect(screen.getByText("Arithmetic")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
  });

  it("surfaces the content origin trust signal", () => {
    // manual → "Human Authored"
    render(<QuestionTable {...baseProps()} />);
    expect(screen.getByText("Human Authored")).toBeTruthy();
    // ai → "AI Generated"
    cleanup();
    render(
      <QuestionTable {...baseProps({ questions: [makeQuestion({ origin: "ai" })] })} />,
    );
    expect(screen.getByText("AI Generated")).toBeTruthy();
  });

  it("exposes no bulk-selection affordance (no actions to perform)", () => {
    render(<QuestionTable {...baseProps()} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("opens the drawer for a row via the View action", () => {
    const props = baseProps();
    render(<QuestionTable {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /view question/i }));
    expect(props.onOpen).toHaveBeenCalledWith(props.questions[0]);
  });

  it("states the count with an honest note and no dead paging buttons", () => {
    render(<QuestionTable {...baseProps()} />);
    expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByText(/pagination awaiting backend support/i)).toBeTruthy();
    expect(screen.getByText("1 question")).toBeTruthy();
  });

  it("falls back to em-dash for unresolved exam/subject/topic", () => {
    render(
      <QuestionTable
        {...baseProps({
          questions: [makeQuestion({ exam_id: "unknown", subtopic_id: "unknown" })],
          examNameIndex: {},
          subtopicIndex: {},
        })}
      />,
    );
    const row = screen.getByRole("table");
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });
});
