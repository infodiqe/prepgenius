// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WeakTopicsList } from "./WeakTopicsList";

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));

afterEach(() => cleanup());

function topic(id: string, name: string, severity: number) {
  return {
    topic_id: id,
    topic_name: name,
    accuracy: "40.00",
    severity,
    status: "active",
  };
}

describe("WeakTopicsList", () => {
  it("shows an empty state when there are no weak topics", () => {
    render(<WeakTopicsList weakTopics={[]} />);
    expect(screen.getByText("weak_empty_title")).toBeTruthy();
  });

  it("shows the top 3 by severity by default and toggles View All", () => {
    const topics = [
      topic("a", "Low", 1),
      topic("b", "Mid", 2),
      topic("c", "High", 5),
      topic("d", "Higher", 6),
      topic("e", "Highest", 9),
    ];
    render(<WeakTopicsList weakTopics={topics} />);

    // Default: top 3 by severity desc → Highest(9), Higher(6), High(5).
    expect(screen.getByText("Highest")).toBeTruthy();
    expect(screen.getByText("Higher")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
    expect(screen.queryByText("Mid")).toBeNull();
    expect(screen.queryByText("Low")).toBeNull();

    // Expand.
    const toggle = screen.getByRole("button", { name: "view_all" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByText("Mid")).toBeTruthy();
    expect(screen.getByText("Low")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "show_less" }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("orders by severity (highest priority first)", () => {
    const topics = [topic("a", "Alpha", 2), topic("b", "Beta", 8)];
    render(<WeakTopicsList weakTopics={topics} />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    // Beta (severity 8) appears before Alpha (severity 2).
    expect(items[0]).toContain("Beta");
    expect(items[1]).toContain("Alpha");
  });

  it("does not show a toggle when at or below the default count", () => {
    render(<WeakTopicsList weakTopics={[topic("a", "Only", 3)]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
