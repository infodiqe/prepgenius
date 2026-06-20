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

import { PricingPage } from "./PricingPage";

afterEach(() => cleanup());

describe("PricingPage", () => {
  it("renders the hero with title and subtitle", () => {
    render(<PricingPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "hero_title" }),
    ).toBeTruthy();
    expect(screen.getByText("hero_subtitle")).toBeTruthy();
  });

  it("renders all three plan cards", () => {
    render(<PricingPage />);
    expect(screen.getByText("free_label")).toBeTruthy();
    expect(screen.getByText("premium_label")).toBeTruthy();
    expect(screen.getByText("institute_label")).toBeTruthy();
    expect(screen.getByText("free_price")).toBeTruthy();
  });

  it("lists free plan features", () => {
    render(<PricingPage />);
    expect(screen.getByText("free_feature_practice")).toBeTruthy();
    expect(screen.getByText("free_feature_pyq")).toBeTruthy();
    expect(screen.getByText("free_feature_history")).toBeTruthy();
  });

  it("marks premium and institute as coming soon with disabled buttons", () => {
    render(<PricingPage />);
    // "coming_soon" appears as a badge and as the disabled button label.
    expect(screen.getAllByText("coming_soon").length).toBeGreaterThanOrEqual(2);
    const disabled = screen
      .getAllByRole("button")
      .filter((b) => (b as HTMLButtonElement).disabled);
    expect(disabled.length).toBe(2);
  });

  it("renders the pricing FAQ as an accordion", () => {
    render(<PricingPage />);
    expect(screen.getByRole("button", { name: "faq_q1_q" })).toBeTruthy();
    expect(screen.queryByText("faq_q1_a")).toBeNull();
  });

  it("points every active CTA at /register", () => {
    render(<PricingPage />);
    const registerLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/register");
    // hero CTA + free plan CTA + closing CTA
    expect(registerLinks.length).toBe(3);
    expect(screen.getByText("cta_button")).toBeTruthy();
  });
});
