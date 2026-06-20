// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WeakTopicDeepDive } from "./WeakTopicDeepDive";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

afterEach(() => cleanup());

function wt(id: string, name: string, severity: number) {
  return { topic_id: id, topic_name: name, accuracy: "40.00", severity, status: "active" };
}

describe("WeakTopicDeepDive", () => {
  it("shows an empty state when there are no weak topics", () => {
    render(<WeakTopicDeepDive weakTopics={[]} recommendations={[]} />);
    expect(screen.getByText("weak_empty_title")).toBeTruthy();
  });

  it("joins the backend recommendation to its topic", () => {
    render(
      <WeakTopicDeepDive
        weakTopics={[wt("w1", "Fractions", 3)]}
        recommendations={[
          {
            topic_id: "w1",
            topic_name: "Fractions",
            subject_name: "Mathematics",
            accuracy: "40.00",
            severity: 3,
            recommended_action: "Practice Mathematics Fractions",
          },
        ]}
      />,
    );
    expect(screen.getByText("Fractions")).toBeTruthy();
    expect(screen.getByText("Practice Mathematics Fractions")).toBeTruthy();
  });

  it("filters by severity", () => {
    render(
      <WeakTopicDeepDive
        weakTopics={[wt("a", "HighOne", 3), wt("b", "LowOne", 1)]}
        recommendations={[]}
      />,
    );
    // Both visible under "All".
    expect(screen.getByText("HighOne")).toBeTruthy();
    expect(screen.getByText("LowOne")).toBeTruthy();
    // Filter to High (severity 3).
    fireEvent.click(screen.getByRole("button", { name: "severity_high" }));
    expect(screen.getByText("HighOne")).toBeTruthy();
    expect(screen.queryByText("LowOne")).toBeNull();
  });

  it("collapses to the default count with a View All toggle", () => {
    const topics = Array.from({ length: 6 }, (_, i) => wt(`t${i}`, `Topic${i}`, 2));
    render(<WeakTopicDeepDive weakTopics={topics} recommendations={[]} />);
    // Default shows 4.
    expect(screen.queryByText("Topic4")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "view_all" }));
    expect(screen.getByText("Topic4")).toBeTruthy();
    expect(screen.getByText("Topic5")).toBeTruthy();
  });
});
