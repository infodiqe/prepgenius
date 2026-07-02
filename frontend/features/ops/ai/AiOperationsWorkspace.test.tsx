// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { ApiError } from "@/lib/errors";

vi.mock("./aiDraftService", async (importActual) => {
  const actual = await importActual<typeof import("./aiDraftService")>();
  return {
    ...actual,
    listAiJobs: vi.fn(),
    listAiDrafts: vi.fn(),
    getAiDraft: vi.fn(),
    importAiDraft: vi.fn(),
    discardAiDraft: vi.fn(),
    listExams: vi.fn().mockResolvedValue([]),
    getExamTree: vi.fn().mockResolvedValue({ subjects: [] }),
  };
});

import { AiOperationsWorkspace } from "./AiOperationsWorkspace";
import {
  discardAiDraft,
  getAiDraft,
  listAiDrafts,
  listAiJobs,
  type AiDraftDetail,
  type AiDraftListItem,
  type AiGenerationJob,
} from "./aiDraftService";

const mJobs = listAiJobs as unknown as ReturnType<typeof vi.fn>;
const mDrafts = listAiDrafts as unknown as ReturnType<typeof vi.fn>;
const mDetail = getAiDraft as unknown as ReturnType<typeof vi.fn>;
const mDiscard = discardAiDraft as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function job(over: Partial<AiGenerationJob> = {}): AiGenerationJob {
  return {
    id: "j1", status: "running", progress: 40, requested_count: 10, generated_count: 3,
    failed_count: 0, provider: "groq", model: "llama", error_message: "",
    duration_seconds: null, started_at: null, completed_at: null, created_at: "2026-07-02T10:00:00Z",
    ...over,
  };
}
function row(over: Partial<AiDraftListItem> = {}): AiDraftListItem {
  return {
    id: "d1", status: "generated", exam: "CTET", subject: "Maths", topic: "Fractions",
    question_type: "single_correct", difficulty: "medium", bloom_level: "apply", language: "en",
    stem: "What is 1/2 + 1/2?", provider: "groq", model: "llama", imported_question: null,
    created_by_email: "a@b.com", created_at: "2026-07-02T10:00:00Z", ...over,
  };
}
function detail(over: Partial<AiDraftDetail> = {}): AiDraftDetail {
  return {
    ...row(), subtopic: null, prompt_type: "question_generation",
    options: [{ label: "A", text: "0", is_correct: false }, { label: "B", text: "1", is_correct: true }],
    correct_answer: "B", explanation: "e", learning_objective: "lo", estimated_time: 30,
    tags: [], confidence: 0.9, generation_prompt: "p",
    validation_report: { valid: true, errors: [], warnings: [] }, imported_at: null,
    updated_at: "2026-07-02T10:00:00Z", ...over,
  };
}

const emptyPage = { count: 0, next: null, previous: null, results: [] };

describe("AiOperationsWorkspace — auto refresh", () => {
  it("polls jobs every 5s while a job is active", async () => {
    vi.useFakeTimers();
    mJobs.mockResolvedValue([job({ status: "running" })]);
    mDrafts.mockResolvedValue(emptyPage);

    render(<AiOperationsWorkspace />);
    await vi.advanceTimersByTimeAsync(0); // flush initial loads
    expect(mJobs).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(mJobs).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(mJobs).toHaveBeenCalledTimes(3);
  });

  it("does not poll when no job is active", async () => {
    vi.useFakeTimers();
    mJobs.mockResolvedValue([job({ status: "completed" })]);
    mDrafts.mockResolvedValue(emptyPage);

    render(<AiOperationsWorkspace />);
    await vi.advanceTimersByTimeAsync(0);
    expect(mJobs).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15000);
    expect(mJobs).toHaveBeenCalledTimes(1); // no polling
  });
});

describe("AiOperationsWorkspace — permissions", () => {
  it("shows access-denied when jobs return 403", async () => {
    mJobs.mockRejectedValue(new ApiError(403));
    mDrafts.mockResolvedValue(emptyPage);
    render(<AiOperationsWorkspace />);
    expect(await screen.findByText("Access denied")).toBeTruthy();
  });
});

describe("AiOperationsWorkspace — discard flow", () => {
  it("previews a draft and discards it via the confirmation dialog", async () => {
    mJobs.mockResolvedValue([]);
    mDrafts.mockResolvedValue({ count: 1, next: null, previous: null, results: [row()] });
    mDetail.mockResolvedValue(detail());
    mDiscard.mockResolvedValue(detail({ status: "discarded" }));

    render(<AiOperationsWorkspace />);

    // Open the preview from the draft row.
    fireEvent.click(await screen.findByRole("button", { name: /Preview draft/ }));
    await waitFor(() => expect(mDetail).toHaveBeenCalledWith("d1"));

    // Preview's Discard opens the confirmation dialog.
    fireEvent.click(await screen.findByRole("button", { name: "Discard draft" }));

    const dialog = await screen.findByRole("dialog", { name: /Discard this draft/ });
    fireEvent.click(within(dialog).getByRole("button", { name: "Discard draft" }));

    await waitFor(() => expect(mDiscard).toHaveBeenCalledWith("d1"));
    // Draft list reloaded after the action (initial + reload).
    await waitFor(() => expect(mDrafts).toHaveBeenCalledTimes(2));
  });

  it("opens the import dialog from the preview", async () => {
    mJobs.mockResolvedValue([]);
    mDrafts.mockResolvedValue({ count: 1, next: null, previous: null, results: [row()] });
    mDetail.mockResolvedValue(detail());

    render(<AiOperationsWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: /Preview draft/ }));
    await waitFor(() => expect(mDetail).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: "Import draft" }));
    expect(await screen.findByRole("dialog", { name: /Import draft into review/ })).toBeTruthy();
  });
});
