// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TopicMasteryList } from "./TopicMasteryList";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

afterEach(() => cleanup());

const TOPICS = [
  {
    topic_id: "low",
    topic_name: "LowRate",
    attempts: 20,
    correct: 4,
    success_rate: "20.00",
    avg_time: "30.00",
    last_practiced_at: "2026-06-01T00:00:00Z",
  },
  {
    topic_id: "high",
    topic_name: "HighRate",
    attempts: 5,
    correct: 4,
    success_rate: "90.00",
    avg_time: "25.00",
    last_practiced_at: "2026-06-15T00:00:00Z",
  },
  {
    topic_id: "mid",
    topic_name: "MidRate",
    attempts: 12,
    correct: 6,
    success_rate: "50.00",
    avg_time: "20.00",
    last_practiced_at: null,
  },
];

function names() {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
}

describe("TopicMasteryList — sorting", () => {
  it("defaults to success_rate descending", () => {
    render(<TopicMasteryList topics={TOPICS} />);
    expect(names()).toEqual(["HighRate", "MidRate", "LowRate"]);
  });

  it("sorts by attempts descending", () => {
    render(<TopicMasteryList topics={TOPICS} />);
    fireEvent.click(screen.getByRole("button", { name: "sort_attempts" }));
    expect(names()).toEqual(["LowRate", "MidRate", "HighRate"]);
  });

  it("sorts by most recently practised (nulls last)", () => {
    render(<TopicMasteryList topics={TOPICS} />);
    fireEvent.click(screen.getByRole("button", { name: "sort_recent" }));
    expect(names()).toEqual(["HighRate", "LowRate", "MidRate"]);
  });

  it("marks the active sort with aria-pressed", () => {
    render(<TopicMasteryList topics={TOPICS} />);
    const attemptsBtn = screen.getByRole("button", { name: "sort_attempts" });
    expect(attemptsBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(attemptsBtn);
    expect(
      screen.getByRole("button", { name: "sort_attempts" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("renders a progressbar per topic", () => {
    render(<TopicMasteryList topics={TOPICS} />);
    expect(screen.getAllByRole("progressbar")).toHaveLength(3);
  });
});
