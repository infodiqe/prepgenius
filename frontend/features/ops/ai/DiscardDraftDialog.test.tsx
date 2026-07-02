// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { DiscardDraftDialog } from "./DiscardDraftDialog";
import type { AiDraftListItem } from "./aiDraftService";

afterEach(() => cleanup());

const draft = { id: "d1", stem: "Question stem here" } as AiDraftListItem;
const base = {
  open: true,
  onOpenChange: vi.fn(),
  draft,
  onConfirm: vi.fn(),
  submitting: false,
  error: null as string | null,
};

describe("DiscardDraftDialog", () => {
  it("renders a labelled confirmation dialog", () => {
    render(<DiscardDraftDialog {...base} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Discard this draft?")).toBeTruthy();
    expect(screen.getByText("Question stem here")).toBeTruthy();
  });

  it("confirm fires onConfirm", () => {
    const onConfirm = vi.fn();
    render(<DiscardDraftDialog {...base} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("cancel closes the dialog", () => {
    const onOpenChange = vi.fn();
    render(<DiscardDraftDialog {...base} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submitting disables actions and shows progress label", () => {
    render(<DiscardDraftDialog {...base} submitting />);
    expect(screen.getByRole("button", { name: "Discarding…" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows an error alert", () => {
    render(<DiscardDraftDialog {...base} error="Conflict: already imported" />);
    expect(screen.getByRole("alert").textContent).toContain("Conflict");
  });
});
