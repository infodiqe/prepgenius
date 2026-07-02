// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

vi.mock("./aiDraftService", async (importActual) => {
  const actual = await importActual<typeof import("./aiDraftService")>();
  return { ...actual, listExams: vi.fn(), getExamTree: vi.fn() };
});

import { ImportDraftDialog } from "./ImportDraftDialog";
import { getExamTree, listExams, type AiDraftListItem } from "./aiDraftService";

const mockListExams = listExams as unknown as ReturnType<typeof vi.fn>;
const mockGetTree = getExamTree as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const draft = { id: "d1", stem: "Q stem" } as AiDraftListItem;
const base = {
  open: true,
  onOpenChange: vi.fn(),
  draft,
  onConfirm: vi.fn(),
  submitting: false,
  error: null as string | null,
};

const EXAMS = [
  { id: "e1", code: "CTET", name: "CTET Paper I", exam_type: "q", audience_is_minor: false, is_active: true, created_at: "", updated_at: "" },
];
const TREE = {
  ...EXAMS[0],
  subjects: [
    { id: "s", name: "Maths", position: 0, topics: [
      { id: "t", name: "Fractions", position: 0, subtopics: [{ id: "st1", name: "Proper", position: 0 }] },
    ] },
  ],
};

describe("ImportDraftDialog", () => {
  it("loads exams on open and disables confirm until exam + subtopic chosen", async () => {
    mockListExams.mockResolvedValue(EXAMS);
    mockGetTree.mockResolvedValue(TREE);
    render(<ImportDraftDialog {...base} />);

    // Exam option appears after load.
    await waitFor(() => expect(mockListExams).toHaveBeenCalled());
    await screen.findByRole("option", { name: /CTET Paper I/ });

    const confirm = screen.getByRole("button", { name: "Import draft" });
    expect(confirm.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Target exam"), { target: { value: "e1" } });
    await waitFor(() => expect(mockGetTree).toHaveBeenCalledWith("e1"));
    await screen.findByRole("option", { name: /Maths › Fractions › Proper/ });

    fireEvent.change(screen.getByLabelText("Target subtopic"), { target: { value: "st1" } });
    expect(confirm.hasAttribute("disabled")).toBe(false);
  });

  it("confirm fires onConfirm with the selected exam + subtopic", async () => {
    mockListExams.mockResolvedValue(EXAMS);
    mockGetTree.mockResolvedValue(TREE);
    const onConfirm = vi.fn();
    render(<ImportDraftDialog {...base} onConfirm={onConfirm} />);

    await screen.findByRole("option", { name: /CTET Paper I/ });
    fireEvent.change(screen.getByLabelText("Target exam"), { target: { value: "e1" } });
    await screen.findByRole("option", { name: /Maths › Fractions › Proper/ });
    fireEvent.change(screen.getByLabelText("Target subtopic"), { target: { value: "st1" } });

    fireEvent.click(screen.getByRole("button", { name: "Import draft" }));
    expect(onConfirm).toHaveBeenCalledWith({ exam_id: "e1", subtopic_id: "st1" });
  });

  it("shows an error alert", () => {
    mockListExams.mockResolvedValue([]);
    render(<ImportDraftDialog {...base} error="Subtopic does not belong to exam" />);
    expect(screen.getByRole("alert").textContent).toContain("Subtopic");
  });
});
