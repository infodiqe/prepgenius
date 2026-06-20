// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SectionTrendCard } from "./SectionTrendCard";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

afterEach(() => cleanup());

const GROUPS = [
  {
    scope_id: "s1",
    scope_name: "Science",
    history: [
      { attempt_id: "a1", created_at: "2026-06-01T00:00:00Z", accuracy: "50.00" },
      { attempt_id: "a2", created_at: "2026-06-05T00:00:00Z", accuracy: "75.00" },
    ],
  },
];

describe("SectionTrendCard", () => {
  it("renders the empty text when there are no groups", () => {
    render(
      <SectionTrendCard
        title="Subjects"
        subtitle="sub"
        emptyText="No subject history"
        groups={[]}
      />,
    );
    expect(screen.getByText("No subject history")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("renders each group with its chronological history + progressbars", () => {
    render(
      <SectionTrendCard
        title="Subjects"
        subtitle="sub"
        emptyText="empty"
        groups={GROUPS}
      />,
    );
    expect(screen.getByText("Science")).toBeTruthy();
    // both history points (verbatim accuracy values)
    expect(screen.getByText("50.00%")).toBeTruthy();
    expect(screen.getByText("75.00%")).toBeTruthy();
    // one progressbar per history point
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    // SR-friendly per-scope history list
    expect(screen.getByLabelText("history_aria")).toBeTruthy();
  });

  it("exposes a labelled region with a heading", () => {
    render(
      <SectionTrendCard
        title="Topic Trends"
        subtitle="sub"
        emptyText="empty"
        groups={GROUPS}
      />,
    );
    const region = screen.getByRole("region");
    const labelledby = region.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    expect(document.getElementById(labelledby!)?.textContent).toBe("Topic Trends");
  });
});
