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

import { GuideIndexPage } from "./GuideIndexPage";
import type { CmsGuideCard } from "@/lib/cms/api";

const GUIDES: CmsGuideCard[] = [
  {
    slug: "ctet-eligibility",
    title: "CTET Eligibility",
    meta_description: "Who can apply for CTET.",
    category: "CTET",
  },
  {
    slug: "how-to-prepare-for-ctet",
    title: "How to Prepare for CTET",
    meta_description: "A study plan.",
    category: "CTET",
  },
  {
    slug: "assam-tet-pattern",
    title: "Assam TET Pattern",
    meta_description: "The exam pattern.",
    category: "Assam TET",
  },
];

afterEach(() => cleanup());

describe("GuideIndexPage", () => {
  it("renders the hero and CTA", () => {
    render(<GuideIndexPage guides={GUIDES} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "hero_title" }),
    ).toBeTruthy();
    const register = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/register");
    expect(register.length).toBe(1);
  });

  it("renders a card per guide linking to its detail page", () => {
    render(<GuideIndexPage guides={GUIDES} />);
    expect(screen.getByText("CTET Eligibility")).toBeTruthy();
    expect(screen.getByText("Who can apply for CTET.")).toBeTruthy();
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "/guides/ctet-eligibility");
    expect(link).toBeTruthy();
  });

  it("groups cards by category", () => {
    render(<GuideIndexPage guides={GUIDES} />);
    // Category headings rendered from the card data, not i18n.
    expect(screen.getByText("CTET")).toBeTruthy();
    expect(screen.getByText("Assam TET")).toBeTruthy();
  });

  it("shows an empty state when there are no guides", () => {
    render(<GuideIndexPage guides={[]} />);
    expect(screen.getByText("empty_title")).toBeTruthy();
    expect(screen.queryByText("CTET")).toBeNull();
  });
});
