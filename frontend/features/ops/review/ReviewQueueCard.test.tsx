// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ReviewQueueCard } from "./ReviewQueueCard";
import type { ContentQuestion } from "../content/contentService";

afterEach(() => cleanup());

function makeQuestion(over: Partial<ContentQuestion> = {}): ContentQuestion {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    exam_id: "exam-1",
    subtopic_id: "sub-1",
    stem: "What is 2 + 2?",
    explanation: "",
    difficulty: 2,
    language: "en",
    origin: "manual",
    review_status: "in_review",
    verified_by_id: null,
    tags: {},
    options: [{ id: "o1", label: "A", body: "4", is_correct: true, position: 0 }],
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    ...over,
  } as ContentQuestion;
}

describe("ReviewQueueCard", () => {
  it("renders the question summary, exam, subject/topic and status badge", () => {
    render(
      <ReviewQueueCard
        question={makeQuestion()}
        examName="CTET"
        label={{ subject: "Maths", topic: "Arithmetic" }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("What is 2 + 2?")).toBeTruthy();
    expect(screen.getByText("CTET")).toBeTruthy();
    expect(screen.getByText("Maths / Arithmetic")).toBeTruthy();
    expect(screen.getByText("In Review")).toBeTruthy();
  });

  it("opens the drawer when activated", () => {
    const onOpen = vi.fn();
    const q = makeQuestion();
    render(<ReviewQueueCard question={q} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /open question/i }));
    expect(onOpen).toHaveBeenCalledWith(q);
  });
});
