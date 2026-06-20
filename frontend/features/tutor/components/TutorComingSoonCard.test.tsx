// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TutorComingSoonCard } from "./TutorComingSoonCard";

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));

afterEach(() => cleanup());

describe("TutorComingSoonCard", () => {
  it("renders the coming-soon title and description", () => {
    render(<TutorComingSoonCard />);
    expect(screen.getByText("coming_soon_title")).toBeTruthy();
    expect(screen.getByText("coming_soon_description")).toBeTruthy();
  });

  it("lists all four future capabilities", () => {
    render(<TutorComingSoonCard />);
    expect(screen.getByText("explain_answers")).toBeTruthy();
    expect(screen.getByText("explain_concepts")).toBeTruthy();
    expect(screen.getByText("translate_explanations")).toBeTruthy();
    expect(screen.getByText("follow_up_questions")).toBeTruthy();
  });

  it("is exposed as a labelled region with a heading", () => {
    render(<TutorComingSoonCard />);
    const region = screen.getByRole("region");
    const labelledby = region.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    expect(document.getElementById(labelledby!)?.textContent).toBe(
      "coming_soon_title",
    );
  });
});
