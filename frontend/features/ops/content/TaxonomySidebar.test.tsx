// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { TaxonomySidebar } from "./TaxonomySidebar";
import type { ContentExam, ContentExamTree } from "./contentService";

afterEach(() => cleanup());

const EXAMS: ContentExam[] = [
  { id: "exam-1", code: "CTET", name: "CTET" },
  { id: "exam-2", code: "UPSC", name: "UPSC" },
];

const TREE: ContentExamTree = {
  id: "exam-1",
  code: "CTET",
  name: "CTET",
  subjects: [
    {
      id: "s1",
      name: "Maths",
      position: 0,
      topics: [{ id: "t1", name: "Arithmetic", position: 0, subtopics: [] }],
    },
  ],
};

function renderSidebar(over: Partial<React.ComponentProps<typeof TaxonomySidebar>> = {}) {
  const props = {
    exams: EXAMS,
    selectedExamId: "",
    tree: null,
    treeLoading: false,
    onSelectExam: vi.fn(),
    ...over,
  };
  return { props, ...render(<TaxonomySidebar {...props} />) };
}

describe("TaxonomySidebar", () => {
  it("renders an empty state when there are no exams", () => {
    renderSidebar({ exams: [] });
    expect(screen.getByText("No exams found")).toBeTruthy();
  });

  it("lists exams and filters by exam on selection", () => {
    const { props } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "UPSC" }));
    expect(props.onSelectExam).toHaveBeenCalledWith("exam-2");
  });

  it("clears the exam filter via 'All exams'", () => {
    const { props } = renderSidebar({ selectedExamId: "exam-1" });
    fireEvent.click(screen.getByRole("button", { name: "All exams" }));
    expect(props.onSelectExam).toHaveBeenCalledWith("");
  });

  it("marks the selected exam as pressed and shows its subjects/topics read-only", () => {
    renderSidebar({ selectedExamId: "exam-1", tree: TREE });
    expect(
      screen.getByRole("button", { name: "CTET" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("Maths")).toBeTruthy();
    expect(screen.getByText("Arithmetic")).toBeTruthy();
    expect(screen.getByText(/awaiting backend support/i)).toBeTruthy();
  });

  it("shows a loading indicator while the tree loads", () => {
    renderSidebar({ selectedExamId: "exam-1", tree: null, treeLoading: true });
    expect(screen.getByText("Loading subjects…")).toBeTruthy();
  });

  it("labels the taxonomy navigation region", () => {
    renderSidebar();
    expect(screen.getByRole("navigation", { name: "Content taxonomy" })).toBeTruthy();
  });
});
