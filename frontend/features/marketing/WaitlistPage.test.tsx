// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { WaitlistPage } from "./WaitlistPage";

afterEach(() => cleanup());

describe("WaitlistPage", () => {
  it("renders the hero with title, subtitle and CTA", () => {
    render(<WaitlistPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "hero_title" }),
    ).toBeTruthy();
    expect(screen.getByText("hero_subtitle")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "hero_cta" }).getAttribute("href"),
    ).toBe("#join");
  });

  it("renders the waitlist form fields", () => {
    render(<WaitlistPage />);
    expect(
      (screen.getByLabelText("name_label") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("email_label") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("interest_label") as HTMLSelectElement).disabled,
    ).toBe(true);
  });

  it("offers Student, Teacher and Institute interest options", () => {
    render(<WaitlistPage />);
    expect(screen.getByRole("option", { name: "interest_student" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "interest_teacher" })).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "interest_institute" }),
    ).toBeTruthy();
  });

  it("disables both submit buttons (no backend, no fake success)", () => {
    render(<WaitlistPage />);
    const comingSoon = screen.getAllByRole("button", { name: "coming_soon" });
    // Waitlist submit + newsletter subscribe.
    expect(comingSoon.length).toBe(2);
    for (const button of comingSoon) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("renders a newsletter email field", () => {
    render(<WaitlistPage />);
    expect(
      (screen.getByLabelText("newsletter_email_label") as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it("links institutes to sales via mailto", () => {
    render(<WaitlistPage />);
    expect(
      screen.getByRole("link", { name: "sales_cta" }).getAttribute("href"),
    ).toBe("mailto:sales_email");
  });

  it("renders the FAQ as an accordion", () => {
    render(<WaitlistPage />);
    expect(screen.getByRole("button", { name: "faq_q1_q" })).toBeTruthy();
    expect(screen.queryByText("faq_q1_a")).toBeNull();
  });
});
