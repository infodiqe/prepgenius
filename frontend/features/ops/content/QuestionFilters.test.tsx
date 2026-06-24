// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { QuestionFilters } from "./QuestionFilters";
import type { ContentExam } from "./contentService";

afterEach(() => cleanup());

const EXAMS: ContentExam[] = [
  { id: "exam-1", code: "CTET", name: "CTET" },
  { id: "exam-2", code: "UPSC", name: "UPSC" },
];

function renderFilters(overrides: Partial<React.ComponentProps<typeof QuestionFilters>> = {}) {
  const props = {
    exams: EXAMS,
    examId: "",
    status: "" as const,
    onExamChange: vi.fn(),
    onStatusChange: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<QuestionFilters {...props} />) };
}

describe("QuestionFilters", () => {
  it("renders the Exam options from props", () => {
    renderFilters();
    const exam = screen.getByLabelText("Exam") as HTMLSelectElement;
    const labels = Array.from(exam.options).map((o) => o.textContent);
    expect(labels).toEqual(["All exams", "CTET", "UPSC"]);
  });

  it("renders the five OPS-02 status options", () => {
    renderFilters();
    const status = screen.getByLabelText("Status") as HTMLSelectElement;
    const labels = Array.from(status.options).map((o) => o.textContent);
    expect(labels).toEqual([
      "All statuses",
      "Draft",
      "In Review",
      "SME Review",
      "Approved",
      "Published",
    ]);
  });

  it("invokes onExamChange / onStatusChange with the selected value", () => {
    const { props } = renderFilters();
    fireEvent.change(screen.getByLabelText("Exam"), {
      target: { value: "exam-2" },
    });
    expect(props.onExamChange).toHaveBeenCalledWith("exam-2");
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "approved" },
    });
    expect(props.onStatusChange).toHaveBeenCalledWith("approved");
  });

  it("disables Subject and Topic with an awaiting-backend note", () => {
    renderFilters();
    expect((screen.getByLabelText("Subject") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("Topic") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/awaiting backend support/i)).toBeTruthy();
  });
});
