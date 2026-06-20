// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Identity translator → assertions check the i18n key that was selected.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "as",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { LandingPage } from "./LandingPage";

afterEach(() => cleanup());

describe("LandingPage", () => {
  it("renders both hero CTAs", () => {
    render(<LandingPage />);
    expect(screen.getByText("cta_primary")).toBeTruthy();
    expect(screen.getByText("cta_secondary")).toBeTruthy();
  });

  it("points the primary CTA at /register", () => {
    render(<LandingPage />);
    const links = screen.getAllByRole("link", { name: "cta_primary" });
    expect(links.some((l) => l.getAttribute("href") === "/register")).toBe(true);
  });

  it("renders the benefits cards", () => {
    render(<LandingPage />);
    expect(screen.getByText("ai_title")).toBeTruthy();
    expect(screen.getByText("practice_title")).toBeTruthy();
    expect(screen.getByText("readiness_title")).toBeTruthy();
  });

  it("renders the how-it-works steps", () => {
    render(<LandingPage />);
    expect(screen.getByText("step1_title")).toBeTruthy();
    expect(screen.getByText("step2_title")).toBeTruthy();
    expect(screen.getByText("step3_title")).toBeTruthy();
  });

  it("renders exam coverage", () => {
    render(<LandingPage />);
    expect(screen.getByText("ctet")).toBeTruthy();
    expect(screen.getByText("assam_tet")).toBeTruthy();
    expect(screen.getByText("regional")).toBeTruthy();
  });

  it("renders the pricing preview with a coming-soon plan", () => {
    render(<LandingPage />);
    expect(screen.getByText("free_title")).toBeTruthy();
    expect(screen.getByText("season_title")).toBeTruthy();
    expect(screen.getByText("institution_title")).toBeTruthy();
    expect(screen.getByText("coming_soon")).toBeTruthy();
  });

  it("renders FAQ questions inside an accordion", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: "q1_q" })).toBeTruthy();
    // Answer is collapsed until the question is opened.
    expect(screen.queryByText("q1_a")).toBeNull();
  });
});
