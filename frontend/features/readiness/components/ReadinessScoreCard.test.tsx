// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReadinessScoreCard } from "./ReadinessScoreCard";
import type { Readiness } from "@/features/readiness/readinessService";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

afterEach(() => cleanup());

const SCORED: Readiness = {
  status: "scored",
  score: "75.00",
  band: "on_track",
  computed_at: "2026-06-19T10:00:00Z",
  components: {
    status: "scored",
    band: "on_track",
    scores: {
      mock_performance: 80,
      subject_accuracy: 70,
      topic_accuracy: 65,
      consistency: 40,
      practice_completion: 55,
    },
  },
};

const PROVISIONAL: Readiness = {
  status: "provisional",
  score: null,
  band: "provisional",
  computed_at: null,
  components: {},
};

describe("ReadinessScoreCard — provisional", () => {
  it("renders the T04 provisional empty state", () => {
    render(<ReadinessScoreCard readiness={PROVISIONAL} />);
    expect(screen.getByText("score_title")).toBeTruthy();
    expect(screen.getByText("score_provisional")).toBeTruthy();
    // No score breakdown in provisional state.
    expect(screen.queryByText("breakdown_title")).toBeNull();
  });

  it("treats a null score as provisional even if status says scored", () => {
    render(
      <ReadinessScoreCard
        readiness={{ ...PROVISIONAL, status: "scored" }}
      />,
    );
    expect(screen.getByText("score_provisional")).toBeTruthy();
  });
});

describe("ReadinessScoreCard — scored", () => {
  it("renders the backend score, band and timestamp verbatim", () => {
    render(<ReadinessScoreCard readiness={SCORED} />);
    expect(screen.getByText("75.00%")).toBeTruthy();
    // band label key (identity translator) for on_track
    expect(screen.getByText("band_on_track")).toBeTruthy();
    expect(screen.getByText("breakdown_title")).toBeTruthy();
  });

  it("renders each component from the backend breakdown", () => {
    render(<ReadinessScoreCard readiness={SCORED} />);
    expect(screen.getByText("comp_mock_performance")).toBeTruthy();
    expect(screen.getByText("comp_practice_completion")).toBeTruthy();
    // Values shown verbatim (no client rounding/recompute).
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText("55%")).toBeTruthy();
    // One progressbar per component (5).
    expect(screen.getAllByRole("progressbar")).toHaveLength(5);
  });

  it("is exposed as a labelled region with a heading", () => {
    render(<ReadinessScoreCard readiness={SCORED} />);
    const region = screen.getByRole("region");
    const labelledby = region.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    expect(document.getElementById(labelledby!)?.textContent).toBe("score_title");
  });

  it("omits components missing from the backend payload", () => {
    render(
      <ReadinessScoreCard
        readiness={{
          ...SCORED,
          components: { scores: { mock_performance: 90 } },
        }}
      />,
    );
    expect(screen.getByText("comp_mock_performance")).toBeTruthy();
    expect(screen.queryByText("comp_consistency")).toBeNull();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });
});
