// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ReviewFilters } from "./ReviewFilters";
import type { ContentExam } from "../content/contentService";

afterEach(() => cleanup());

const EXAMS: ContentExam[] = [
  { id: "exam-1", code: "CTET", name: "CTET" },
  { id: "exam-2", code: "UPSC", name: "UPSC" },
];

function renderFilters(over: Partial<React.ComponentProps<typeof ReviewFilters>> = {}) {
  const props = {
    exams: EXAMS,
    examId: "",
    onExamChange: vi.fn(),
    onRefresh: vi.fn(),
    ...over,
  };
  return { props, ...render(<ReviewFilters {...props} />) };
}

describe("ReviewFilters", () => {
  it("renders the exam options", () => {
    renderFilters();
    const exam = screen.getByLabelText("Exam") as HTMLSelectElement;
    expect(Array.from(exam.options).map((o) => o.textContent)).toEqual([
      "All exams",
      "CTET",
      "UPSC",
    ]);
  });

  it("filters by exam (server exam_id)", () => {
    const { props } = renderFilters();
    fireEvent.change(screen.getByLabelText("Exam"), {
      target: { value: "exam-2" },
    });
    expect(props.onExamChange).toHaveBeenCalledWith("exam-2");
  });

  it("re-fetches on Refresh", () => {
    const { props } = renderFilters();
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(props.onRefresh).toHaveBeenCalled();
  });
});
