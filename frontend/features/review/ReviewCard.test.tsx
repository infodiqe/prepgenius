// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReviewCard } from "./ReviewCard";

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));

afterEach(() => cleanup());

const QUESTION = {
  id: "abcdef12-3456-7890-abcd-ef1234567890",
  stem: "What is the capital of Assam?",
  review_status: "in_review",
  created_at: "2026-06-01T00:00:00Z",
};

describe("ReviewCard", () => {
  it("renders id, snippet, subject, topic and claimant", () => {
    render(
      <ReviewCard
        question={QUESTION}
        subject="Geography"
        topic="States"
        claimedByName="Asha Reviewer"
      />,
    );
    expect(screen.getByText("abcdef12")).toBeTruthy(); // short id
    expect(screen.getByText("What is the capital of Assam?")).toBeTruthy();
    expect(screen.getByText("Geography")).toBeTruthy();
    expect(screen.getByText("States")).toBeTruthy();
    expect(screen.getByText("Asha Reviewer")).toBeTruthy();
    // localized status label key rendered by the badge
    expect(screen.getByText("status_in_review")).toBeTruthy();
  });

  it("falls back to the unclaimed label when nobody has claimed it", () => {
    render(<ReviewCard question={QUESTION} />);
    expect(screen.getByText("not_claimed")).toBeTruthy();
  });
});
