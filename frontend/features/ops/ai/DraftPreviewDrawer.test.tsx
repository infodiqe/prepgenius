// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { DraftPreviewDrawer } from "./DraftPreviewDrawer";
import type { AiDraftDetail } from "./aiDraftService";

afterEach(() => cleanup());

function detail(over: Partial<AiDraftDetail> = {}): AiDraftDetail {
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
    subtopic: null,
    prompt_type: "question_generation",
    options: [
      { label: "A", text: "0", is_correct: false },
      { label: "B", text: "1", is_correct: true },
    ],
    correct_answer: "B",
    explanation: "Halves sum to one.",
    learning_objective: "Add fractions",
    estimated_time: 30,
    tags: ["fractions"],
    confidence: 0.9,
    generation_prompt: "prompt",
    validation_report: { valid: true, errors: [], warnings: [{ code: "tags_empty", severity: "warning", field: "tags", message: "No tags provided." }] },
    imported_at: null,
    updated_at: "2026-07-02T10:00:00Z",
    ...over,
  };
}

const base = { open: true, onOpenChange: vi.fn(), onImport: vi.fn(), onDiscard: vi.fn(), onRetry: vi.fn() };

describe("DraftPreviewDrawer", () => {
  it("shows loading", () => {
    render(<DraftPreviewDrawer {...base} phase="loading" draft={null} />);
    expect(screen.getByText("Loading draft…")).toBeTruthy();
  });

  it("renders preview fields incl. correct option and warnings", () => {
    render(<DraftPreviewDrawer {...base} phase="ready" draft={detail()} />);
    expect(screen.getByText("What is 1/2 + 1/2?")).toBeTruthy();
    expect(screen.getByText("Halves sum to one.")).toBeTruthy();
    expect(screen.getByText("No tags provided.")).toBeTruthy();
    expect(screen.getAllByText("Correct").length).toBeGreaterThan(0);
    expect(screen.getByText("question_generation")).toBeTruthy();
  });

  it("enables actions for generated drafts", () => {
    const onImport = vi.fn();
    render(<DraftPreviewDrawer {...base} phase="ready" draft={detail()} onImport={onImport} />);
    const importBtn = screen.getByRole("button", { name: "Import draft" });
    expect(importBtn.hasAttribute("disabled")).toBe(false);
  });

  it("disables actions for imported drafts", () => {
    render(<DraftPreviewDrawer {...base} phase="ready" draft={detail({ status: "imported" })} />);
    expect(screen.getByRole("button", { name: "Import draft" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Discard draft" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Only generated drafts/)).toBeTruthy();
  });
});
