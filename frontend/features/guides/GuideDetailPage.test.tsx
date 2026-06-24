// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { GuideDetailPage } from "./GuideDetailPage";
import type { CmsGuideDetail } from "@/lib/cms/api";

const GUIDE: CmsGuideDetail = {
  slug: "how-to-prepare-for-ctet",
  title: "How to Prepare for CTET",
  meta_title: "",
  meta_description: "A study plan.",
  category: "CTET",
  locale: "en",
  published_at: "2026-01-01T00:00:00Z",
  blocks: [
    { block_type: "rich_text", sort_order: 0, content: { heading: "Step One", html: "<p>Begin</p>" } },
    { block_type: "rich_text", sort_order: 1, content: { heading: "Step Two", html: "<p>Continue</p>" } },
  ],
  related: [
    { slug: "ctet-eligibility", title: "CTET Eligibility", meta_description: "Who can apply.", category: "CTET" },
  ],
};

afterEach(() => cleanup());

describe("GuideDetailPage", () => {
  it("renders the title and category", () => {
    render(<GuideDetailPage guide={GUIDE} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "How to Prepare for CTET" }),
    ).toBeTruthy();
    expect(screen.getByText("CTET")).toBeTruthy();
  });

  it("renders CMS blocks with anchored headings", () => {
    const { container } = render(<GuideDetailPage guide={GUIDE} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Step One" }),
    ).toBeTruthy();
    expect(container.querySelector("#step-one")).toBeTruthy();
    expect(container.querySelector("#step-two")).toBeTruthy();
  });

  it("builds a table of contents from rich-text headings", () => {
    const { container } = render(<GuideDetailPage guide={GUIDE} />);
    const tocLinks = Array.from(
      container.querySelectorAll('a[href^="#"]'),
    ).map((a) => a.getAttribute("href"));
    expect(tocLinks).toContain("#step-one");
    expect(tocLinks).toContain("#step-two");
  });

  it("renders related guides linking to their detail pages", () => {
    render(<GuideDetailPage guide={GUIDE} />);
    expect(screen.getByText("related_title")).toBeTruthy();
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "/guides/ctet-eligibility");
    expect(link).toBeTruthy();
  });

  it("omits the related section when there are no related guides", () => {
    render(<GuideDetailPage guide={{ ...GUIDE, related: [] }} />);
    expect(screen.queryByText("related_title")).toBeNull();
  });
});
