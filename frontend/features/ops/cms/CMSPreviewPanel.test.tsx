// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { CMSPreviewPanel } from "./CMSPreviewPanel";
import type { CmsBlock } from "./cmsService";

afterEach(() => cleanup());

const BLOCKS: CmsBlock[] = [
  { block_type: "rich_text", sort_order: 1, content: { body: "Second block" } },
  { block_type: "hero", sort_order: 0, content: { heading: "Welcome" } },
];

describe("CMSPreviewPanel", () => {
  it("renders an empty state when there are no blocks", () => {
    render(<CMSPreviewPanel blocks={[]} />);
    expect(screen.getByText("No content blocks")).toBeTruthy();
  });

  it("renders blocks read-only, ordered by sort_order, with humanised types", () => {
    render(<CMSPreviewPanel blocks={BLOCKS} />);
    const headings = screen.getAllByRole("heading");
    expect(headings.map((h) => h.textContent)).toEqual(["Hero", "Rich Text"]);
    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(screen.getByText("Second block")).toBeTruthy();
  });

  it("exposes no editing controls (read-only)", () => {
    const { container } = render(<CMSPreviewPanel blocks={BLOCKS} />);
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
  });
});
