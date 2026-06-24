// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { PreviousYearPaperPanel } from "./PreviousYearPaperPanel";
import type { PreviousYearPaper } from "./examService";

afterEach(() => cleanup());

const PAPER: PreviousYearPaper = {
  id: "p1",
  exam_id: "exam-1",
  code: "CTET-2024",
  year: 2024,
  language: "en",
  file_path: "/uploads/ctet-2024.pdf",
  total_questions: 150,
  created_at: "2026-01-01T00:00:00Z",
};

function baseProps(over: Partial<React.ComponentProps<typeof PreviousYearPaperPanel>> = {}) {
  return {
    phase: "ready" as const,
    papers: [PAPER],
    examNameIndex: { "exam-1": "CTET" },
    onRetry: vi.fn(),
    ...over,
  };
}

describe("PreviousYearPaperPanel", () => {
  it("renders a loading state", () => {
    render(<PreviousYearPaperPanel {...baseProps({ phase: "loading", papers: [] })} />);
    expect(screen.getByRole("status", { name: "Loading papers" })).toBeTruthy();
  });

  it("renders an error state with Retry", () => {
    const props = baseProps({ phase: "error", papers: [] });
    render(<PreviousYearPaperPanel {...props} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("renders an empty state", () => {
    render(<PreviousYearPaperPanel {...baseProps({ papers: [] })} />);
    expect(screen.getByText("No papers found")).toBeTruthy();
  });

  it("renders paper rows with resolved exam name", () => {
    render(<PreviousYearPaperPanel {...baseProps()} />);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("CTET-2024")).toBeTruthy();
    expect(screen.getByText("CTET")).toBeTruthy();
    expect(screen.getByText("2024")).toBeTruthy();
    expect(screen.getByText("150")).toBeTruthy();
    expect(screen.getByText("Available")).toBeTruthy();
  });
});
