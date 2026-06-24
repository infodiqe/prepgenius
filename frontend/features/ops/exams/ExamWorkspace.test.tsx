// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ExamWorkspace } from "./ExamWorkspace";
import { listExams, getExamTree, listPapers, type ExamSummary } from "./examService";

vi.mock("./examService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./examService")>();
  return {
    ...actual,
    listExams: vi.fn(),
    getExamTree: vi.fn(),
    listPapers: vi.fn(),
  };
});

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

beforeEach(() => {
  (listExams as Mock).mockResolvedValue([EXAM]);
  (listPapers as Mock).mockResolvedValue([]);
  (getExamTree as Mock).mockResolvedValue({ ...EXAM, subjects: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ExamWorkspace", () => {
  it("renders the five sections as an accessible group", () => {
    render(<ExamWorkspace />);
    expect(screen.getByRole("group", { name: "Exam sections" })).toBeTruthy();
    for (const title of [
      "Exams",
      "Subjects",
      "Topics",
      "Subtopics",
      "Previous Year Papers",
    ]) {
      expect(screen.getByRole("button", { name: title })).toBeTruthy();
    }
  });

  it("loads and lists exams in the default section", async () => {
    render(<ExamWorkspace />);
    expect(await screen.findByText("Central Teacher Eligibility Test")).toBeTruthy();
    expect(listExams).toHaveBeenCalled();
  });

  it("shows an empty state when there are no exams", async () => {
    (listExams as Mock).mockResolvedValue([]);
    render(<ExamWorkspace />);
    expect(await screen.findByText("No exams found")).toBeTruthy();
  });

  it("shows an error state when the exam fetch fails", async () => {
    (listExams as Mock).mockRejectedValue(new Error("boom"));
    render(<ExamWorkspace />);
    expect(await screen.findByText("Could not load exams")).toBeTruthy();
  });

  it("prompts to select an exam in hierarchy sections", () => {
    render(<ExamWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Subjects" }));
    expect(
      screen.getByText(/select an exam to browse its subjects/i),
    ).toBeTruthy();
  });
});
