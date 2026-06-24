// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ExamFilters } from "./ExamFilters";
import type { ExamSummary } from "./examService";

afterEach(() => cleanup());

const EXAMS: ExamSummary[] = [
  {
    id: "exam-1",
    code: "CTET",
    name: "CTET",
    exam_type: "qualifying",
    audience_is_minor: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

function renderFilters(over: Partial<React.ComponentProps<typeof ExamFilters>> = {}) {
  const props = {
    exams: EXAMS,
    selectedExamId: "",
    onSelectExam: vi.fn(),
    showExamSelector: true,
    showListFilters: false,
    examRequired: true,
    ...over,
  };
  return { props, ...render(<ExamFilters {...props} />) };
}

describe("ExamFilters", () => {
  it("offers a functional exam selector for scoped sections", () => {
    const { props } = renderFilters();
    const select = screen.getByLabelText("Exam") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      "Select an exam…",
      "CTET",
    ]);
    fireEvent.change(select, { target: { value: "exam-1" } });
    expect(props.onSelectExam).toHaveBeenCalledWith("exam-1");
  });

  it("includes an 'All exams' option when an exam is not required", () => {
    renderFilters({ examRequired: false });
    const select = screen.getByLabelText("Exam") as HTMLSelectElement;
    expect(select.options[0].textContent).toBe("All exams");
  });

  it("disables the type/status filters with an awaiting-backend note", () => {
    renderFilters({ showExamSelector: false, showListFilters: true });
    expect((screen.getByLabelText("Exam type") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("Status") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/awaiting backend support/i)).toBeTruthy();
  });
});
