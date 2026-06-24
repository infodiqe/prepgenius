// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ReviewDetailDrawer } from "./ReviewDetailDrawer";
import type { ContentQuestion } from "../content/contentService";

afterEach(() => cleanup());

function makeQuestion(over: Partial<ContentQuestion> = {}): ContentQuestion {
  return {
    id: "q-1",
    exam_id: "exam-1",
    subtopic_id: "sub-1",
    stem: "What is the capital of Assam?",
    explanation: "",
    difficulty: 2,
    language: "en",
    origin: "official",
    review_status: "in_review",
    verified_by_id: null,
    tags: {},
    options: [
      { id: "o1", label: "A", body: "Guwahati", is_correct: false, position: 0 },
      { id: "o2", label: "B", body: "Dispur", is_correct: true, position: 1 },
    ],
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    ...over,
  } as ContentQuestion;
}

function open(over: Partial<React.ComponentProps<typeof ReviewDetailDrawer>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    question: makeQuestion(),
    examName: "CTET",
    subject: "GK",
    topic: "Geography",
    onClaim: vi.fn().mockResolvedValue(undefined),
    onRelease: vi.fn().mockResolvedValue(undefined),
    onApprove: vi.fn().mockResolvedValue(undefined),
    onReject: vi.fn().mockResolvedValue(undefined),
    onEscalate: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  return { props, ...render(<ReviewDetailDrawer {...props} />) };
}

describe("ReviewDetailDrawer", () => {
  it("renders nothing when closed", () => {
    render(
      <ReviewDetailDrawer
        open={false}
        onOpenChange={() => {}}
        question={makeQuestion()}
        onClaim={vi.fn()}
        onRelease={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onEscalate={vi.fn()}
      />,
    );
    expect(screen.queryByText("Review question")).toBeNull();
  });

  it("shows the question context (labelled dialog, status, options)", () => {
    open();
    expect(screen.getByLabelText("Review question")).toBeTruthy();
    expect(screen.getByText("What is the capital of Assam?")).toBeTruthy();
    expect(screen.getByText("In Review")).toBeTruthy();
    expect(screen.getByText("Dispur")).toBeTruthy();
  });

  it("claims via the server action", () => {
    const { props } = open();
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(props.onClaim).toHaveBeenCalledWith("q-1");
  });

  it("releases via the server action", () => {
    const { props } = open();
    fireEvent.click(screen.getByRole("button", { name: "Release" }));
    expect(props.onRelease).toHaveBeenCalledWith("q-1");
  });

  it("approves with the current status and comment (no reason required)", () => {
    const { props } = open();
    // Approve is enabled without a reason.
    const approve = screen.getByRole("button", { name: /Approve/ }) as HTMLButtonElement;
    expect(approve.disabled).toBe(false);
    fireEvent.click(approve);
    expect(props.onApprove).toHaveBeenCalledWith("q-1", "in_review", "");
  });

  it("requires a reason before reject / escalate are enabled (§3.4)", () => {
    const { props } = open();
    const reject = screen.getByRole("button", { name: /Reject/ }) as HTMLButtonElement;
    const escalate = screen.getByRole("button", {
      name: /Escalate to SME/,
    }) as HTMLButtonElement;
    expect(reject.disabled).toBe(true);
    expect(escalate.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "needs fixing" },
    });
    expect(reject.disabled).toBe(false);
    expect(escalate.disabled).toBe(false);

    fireEvent.click(reject);
    expect(props.onReject).toHaveBeenCalledWith("q-1", "needs fixing");
  });

  it("escalates to SME with a reason", () => {
    const { props } = open();
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "needs expert" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Escalate to SME/ }));
    expect(props.onEscalate).toHaveBeenCalledWith("q-1", "needs expert");
  });

  it("separates ownership actions from decision actions", () => {
    open();
    expect(screen.getByText("Ownership")).toBeTruthy();
    expect(screen.getByText("Decision")).toBeTruthy();
  });

  it("supports the keyboard workflow: a approves, j/k navigate", () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const { props } = open({ onNext, onPrev });
    fireEvent.keyDown(document.body, { key: "a" });
    expect(props.onApprove).toHaveBeenCalledWith("q-1", "in_review", "");
    fireEvent.keyDown(document.body, { key: "j" });
    expect(onNext).toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "k" });
    expect(onPrev).toHaveBeenCalled();
  });

  it("keyboard reject with no reason focuses the reason field instead of submitting", () => {
    const { props } = open();
    fireEvent.keyDown(document.body, { key: "r" });
    expect(props.onReject).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText(/reason/i));
  });

  it("does not fire shortcuts while typing in the reason field", () => {
    const { props } = open();
    const reason = screen.getByLabelText(/reason/i);
    fireEvent.keyDown(reason, { key: "a" });
    expect(props.onApprove).not.toHaveBeenCalled();
  });

  it("surfaces a server error without optimistic change", async () => {
    open({ onClaim: vi.fn().mockRejectedValue(new Error("Already claimed")) });
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Already claimed",
    );
  });

  it("requests close via the close button", () => {
    const { props } = open();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
