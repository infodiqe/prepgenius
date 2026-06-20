// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExplanationPanel } from "./ExplanationPanel";

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));

afterEach(() => cleanup());

describe("ExplanationPanel", () => {
  it("renders the Ask AI Tutor toggle collapsed by default", () => {
    render(<ExplanationPanel questionId="q-1" />);
    const toggle = screen.getByRole("button", { name: /ask_tutor/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // Collapsed: coming-soon content is not yet in the DOM.
    expect(screen.queryByText("coming_soon_title")).toBeNull();
  });

  it("expands to reveal the coming-soon card and collapses again", () => {
    render(<ExplanationPanel questionId="q-1" questionText="What is X?" />);
    const toggle = screen.getByRole("button", { name: /ask_tutor/ });

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("coming_soon_title")).toBeTruthy();
    expect(screen.getByRole("region", { name: "ask_tutor" })).toBeTruthy();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("coming_soon_title")).toBeNull();
  });

  it("links the toggle to the panel via aria-controls", () => {
    render(<ExplanationPanel questionId="q-1" />);
    const toggle = screen.getByRole("button", { name: /ask_tutor/ });
    fireEvent.click(toggle);
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).toBeTruthy();
  });
});
