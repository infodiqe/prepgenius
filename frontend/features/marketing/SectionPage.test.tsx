// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { SectionPage } from "./SectionPage";

afterEach(() => cleanup());

describe("SectionPage", () => {
  it("renders the page title and intro", () => {
    render(<SectionPage namespace="public_pages.about" sections={["mission"]} />);
    expect(screen.getByRole("heading", { level: 1, name: "title" })).toBeTruthy();
    expect(screen.getByText("intro")).toBeTruthy();
  });

  it("renders a heading and body for every section", () => {
    render(
      <SectionPage
        namespace="public_pages.terms"
        sections={["responsibilities", "liability"]}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "responsibilities_title" }),
    ).toBeTruthy();
    expect(screen.getByText("responsibilities_body")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "liability_title" }),
    ).toBeTruthy();
    expect(screen.getByText("liability_body")).toBeTruthy();
  });
});
