// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CMSStatusBadge, cmsStatusLabel } from "./CMSStatusBadge";

afterEach(() => cleanup());

const CASES: Array<[string, string]> = [
  ["published", "Published"],
  ["draft", "Draft"],
  ["scheduled", "Scheduled"],
  ["archived", "Archived"],
];

describe("CMSStatusBadge", () => {
  it.each(CASES)("renders %s with label + icon (not colour alone)", (status, label) => {
    const { getByText, container } = render(<CMSStatusBadge status={status} />);
    expect(getByText(label)).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("falls back to the raw value for an unknown status", () => {
    const { getByText } = render(<CMSStatusBadge status="weird" />);
    expect(getByText("weird")).toBeTruthy();
  });

  it("cmsStatusLabel maps known statuses", () => {
    expect(cmsStatusLabel("published")).toBe("Published");
    expect(cmsStatusLabel("scheduled")).toBe("Scheduled");
  });

  it("uses semantic tokens (no hardcoded slate-/blue-/indigo-)", () => {
    const { container } = render(<CMSStatusBadge status="published" />);
    expect(container.innerHTML).not.toContain("slate-");
    expect(container.innerHTML).not.toContain("blue-");
    expect(container.innerHTML).not.toContain("indigo-");
  });
});
