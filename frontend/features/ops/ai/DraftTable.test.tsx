// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { DraftTable } from "./DraftTable";
import type { AiDraftListItem } from "./aiDraftService";

afterEach(() => cleanup());

function draft(over: Partial<AiDraftListItem> = {}): AiDraftListItem {
  return {
    id: "d1",
    status: "generated",
    exam: "CTET",
    subject: "Maths",
    topic: "Fractions",
    question_type: "single_correct",
    difficulty: "medium",
    bloom_level: "apply",
    language: "en",
    stem: "What is 1/2 + 1/2?",
    provider: "groq",
    model: "llama",
    imported_question: null,
    created_by_email: "a@b.com",
    created_at: "2026-07-02T10:00:00Z",
    ...over,
  };
}

const base = {
  drafts: [] as AiDraftListItem[],
  ordering: "-created_at",
  onSort: vi.fn(),
  onOpen: vi.fn(),
  onRetry: vi.fn(),
};

describe("DraftTable", () => {
  it("loading", () => {
    render(<DraftTable {...base} phase="loading" />);
    expect(screen.getByLabelText("Loading drafts")).toBeTruthy();
  });

  it("empty", () => {
    render(<DraftTable {...base} phase="empty" />);
    expect(screen.getByText("No drafts match your filters.")).toBeTruthy();
  });

  it("error with retry", () => {
    const onRetry = vi.fn();
    render(<DraftTable {...base} phase="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("forbidden", () => {
    render(<DraftTable {...base} phase="forbidden" />);
    expect(screen.getByText("Access denied")).toBeTruthy();
  });

  it("renders rows and opens preview", () => {
    const onOpen = vi.fn();
    render(<DraftTable {...base} phase="ready" drafts={[draft()]} onOpen={onOpen} />);
    expect(screen.getByText("What is 1/2 + 1/2?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Preview draft/ }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("sort header calls onSort", () => {
    const onSort = vi.fn();
    render(<DraftTable {...base} phase="ready" drafts={[draft()]} onSort={onSort} />);
    fireEvent.click(screen.getByRole("button", { name: "Sort by Difficulty" }));
    expect(onSort).toHaveBeenCalledWith("difficulty");
  });

  it("reflects active sort direction via aria-sort", () => {
    render(<DraftTable {...base} phase="ready" drafts={[draft()]} ordering="-created_at" />);
    const created = screen.getByRole("columnheader", { name: /Created/ });
    expect(created.getAttribute("aria-sort")).toBe("descending");
  });
});
