// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { GenerationJobsPanel } from "./GenerationJobsPanel";
import type { AiGenerationJob } from "./aiDraftService";

afterEach(() => cleanup());

function job(over: Partial<AiGenerationJob> = {}): AiGenerationJob {
  return {
    id: "j1",
    status: "running",
    progress: 40,
    requested_count: 10,
    generated_count: 3,
    failed_count: 1,
    provider: "groq",
    model: "llama",
    error_message: "",
    duration_seconds: 12.5,
    started_at: null,
    completed_at: null,
    created_at: "2026-07-02T10:00:00Z",
    ...over,
  };
}

const base = { jobs: [] as AiGenerationJob[], onRetry: vi.fn() };

describe("GenerationJobsPanel", () => {
  it("renders loading", () => {
    render(<GenerationJobsPanel {...base} phase="loading" />);
    expect(screen.getByLabelText("Loading generation jobs")).toBeTruthy();
  });

  it("renders empty", () => {
    render(<GenerationJobsPanel {...base} phase="empty" />);
    expect(screen.getByText("No generation jobs yet.")).toBeTruthy();
  });

  it("renders error with retry", () => {
    const onRetry = vi.fn();
    render(<GenerationJobsPanel {...base} phase="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders forbidden access state", () => {
    render(<GenerationJobsPanel {...base} phase="forbidden" />);
    expect(screen.getByText("Access denied")).toBeTruthy();
  });

  it("renders a job row with progress bar + remaining", () => {
    render(<GenerationJobsPanel {...base} phase="ready" jobs={[job()]} />);
    const bar = screen.getByRole("progressbar", { name: "Job progress 40%" });
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    // remaining = 10 - 3 - 1 = 6
    expect(screen.getByText(/6 remaining/)).toBeTruthy();
    expect(screen.getByText("Running")).toBeTruthy();
  });

  it("shows the failure message for failed jobs", () => {
    render(
      <GenerationJobsPanel
        {...base}
        phase="ready"
        jobs={[job({ status: "failed", error_message: "provider down" })]}
      />,
    );
    expect(screen.getByText("provider down")).toBeTruthy();
  });

  it("announces refreshing via a live region", () => {
    render(<GenerationJobsPanel {...base} phase="ready" jobs={[job()]} refreshing />);
    expect(screen.getByText("Refreshing…")).toBeTruthy();
  });
});
