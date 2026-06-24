// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { StatusBadge, statusLabel } from "./StatusBadge";
import type { ContentReviewStatus } from "./contentService";

afterEach(() => cleanup());

const CASES: Array<[ContentReviewStatus, string]> = [
  ["draft", "Draft"],
  ["in_review", "In Review"],
  ["sme_review", "SME Review"],
  ["approved", "Approved"],
  ["published", "Published"],
  ["rejected", "Rejected"],
];

describe("StatusBadge", () => {
  it.each(CASES)("renders %s with label + icon (color is not the only signal)", (status, label) => {
    const { getByText, container } = render(<StatusBadge status={status} />);
    // Text label present (so meaning is not conveyed by colour alone).
    expect(getByText(label)).toBeTruthy();
    // Icon present (third redundant channel).
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("statusLabel maps every status to its English label", () => {
    for (const [status, label] of CASES) {
      expect(statusLabel(status)).toBe(label);
    }
  });

  it("uses semantic tokens (no hardcoded slate-/blue-/indigo- classes)", () => {
    const { container } = render(<StatusBadge status="published" />);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
    expect(container.innerHTML).not.toContain("indigo-");
  });
});
