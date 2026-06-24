// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ExamTable } from "./ExamTable";
import type { ExamSummary } from "./examService";

afterEach(() => cleanup());

const EXAM: ExamSummary = {
  id: "exam-1",
  code: "CTET",
  name: "Central Teacher Eligibility Test",
  exam_type: "qualifying",
  audience_is_minor: false,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

function baseProps(over: Partial<React.ComponentProps<typeof ExamTable>> = {}) {
  return {
    phase: "ready" as const,
    exams: [EXAM],
    onOpen: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
}

describe("ExamTable", () => {
  it("renders a loading state", () => {
    render(<ExamTable {...baseProps({ phase: "loading", exams: [] })} />);
    expect(screen.getByRole("status", { name: "Loading exams" })).toBeTruthy();
  });

  it("renders an error state with a working Retry", () => {
    const props = baseProps({ phase: "error", exams: [] });
    render(<ExamTable {...props} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("renders an empty state", () => {
    render(<ExamTable {...baseProps({ exams: [] })} />);
    expect(screen.getByText("No exams found")).toBeTruthy();
  });

  it("renders rows with accessible headers and an active badge", () => {
    render(<ExamTable {...baseProps()} />);
    expect(screen.getByRole("table")).toBeTruthy();
    for (const col of ["Code", "Name", "Type", "Audience", "Status", "Updated"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeTruthy();
    }
    expect(screen.getByText("CTET")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("opens a row via the View action", () => {
    const props = baseProps();
    render(<ExamTable {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Open exam CTET" }));
    expect(props.onOpen).toHaveBeenCalledWith(EXAM);
  });
});
