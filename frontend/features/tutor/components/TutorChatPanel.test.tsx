// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TutorChatPanel } from "./TutorChatPanel";

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));

afterEach(() => cleanup());

describe("TutorChatPanel", () => {
  it("renders the title, subtitle and coming-soon card", () => {
    render(<TutorChatPanel />);
    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getByText("subtitle")).toBeTruthy();
    expect(screen.getByText("coming_soon_title")).toBeTruthy();
  });

  it("shows the history placeholder instead of any conversation", () => {
    render(<TutorChatPanel />);
    // The placeholder text appears (as visible text and as the log aria-label).
    expect(screen.getAllByText("history_placeholder").length).toBeGreaterThan(0);
  });

  it("disables the text input composer", () => {
    render(<TutorChatPanel />);
    const input = screen.getByPlaceholderText("input_placeholder");
    expect((input as HTMLTextAreaElement).disabled).toBe(true);
    expect(input.getAttribute("aria-disabled")).toBe("true");
  });

  it("disables the send button with an accessible label", () => {
    render(<TutorChatPanel />);
    const send = screen.getByRole("button", { name: "send" });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    expect(send.getAttribute("aria-disabled")).toBe("true");
  });

  it("renders a disabled language selector with an accessible label", () => {
    render(<TutorChatPanel />);
    const select = screen.getByLabelText("language");
    expect(select).toBeTruthy();
    expect(select.getAttribute("data-disabled")).not.toBeNull();
  });

  it("accepts future-ready context props without rendering history", () => {
    render(<TutorChatPanel contextType="question" contextId="q-123" />);
    // Still a coming-soon shell: placeholder present, no chat bubbles.
    expect(screen.getAllByText("history_placeholder").length).toBeGreaterThan(0);
  });
});
