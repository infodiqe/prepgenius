// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ExamHierarchyTree } from "./ExamHierarchyTree";
import type { ExamTree } from "./examService";

afterEach(() => cleanup());

const TREE: ExamTree = {
  id: "exam-1",
  code: "CTET",
  name: "CTET",
  exam_type: "qualifying",
  audience_is_minor: false,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  subjects: [
    {
      id: "s1",
      name: "Mathematics",
      position: 0,
      topics: [
        {
          id: "t1",
          name: "Arithmetic",
          position: 0,
          subtopics: [{ id: "st1", name: "Fractions", position: 0 }],
        },
      ],
    },
  ],
};

const EMPTY_TREE: ExamTree = { ...TREE, subjects: [] };

describe("ExamHierarchyTree", () => {
  it("renders an accessible hierarchy region", () => {
    render(<ExamHierarchyTree tree={TREE} defaultDepth={1} onSelect={vi.fn()} />);
    expect(screen.getByRole("navigation", { name: "Exam hierarchy" })).toBeTruthy();
  });

  it("shows only subjects at depth 1 (topics collapsed)", () => {
    render(<ExamHierarchyTree tree={TREE} defaultDepth={1} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Subject Mathematics" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Topic Arithmetic" })).toBeNull();
  });

  it("expands topics at depth 2 and subtopics at depth 3", () => {
    const { rerender } = render(
      <ExamHierarchyTree tree={TREE} defaultDepth={2} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Topic Arithmetic" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Subtopic Fractions" })).toBeNull();

    rerender(<ExamHierarchyTree tree={TREE} defaultDepth={3} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Subtopic Fractions" })).toBeTruthy();
  });

  it("expands a collapsed node via its disclosure toggle", () => {
    render(<ExamHierarchyTree tree={TREE} defaultDepth={1} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Expand Mathematics" }));
    expect(screen.getByRole("button", { name: "Topic Arithmetic" })).toBeTruthy();
  });

  it("selects a node on click", () => {
    const onSelect = vi.fn();
    render(<ExamHierarchyTree tree={TREE} defaultDepth={3} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Subtopic Fractions" }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "subtopic",
        subjectName: "Mathematics",
        topicName: "Arithmetic",
      }),
    );
  });

  it("renders an empty state when there are no subjects", () => {
    render(<ExamHierarchyTree tree={EMPTY_TREE} defaultDepth={1} onSelect={vi.fn()} />);
    expect(screen.getByText("No subjects")).toBeTruthy();
  });
});
