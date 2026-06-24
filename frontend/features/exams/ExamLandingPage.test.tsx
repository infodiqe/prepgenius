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

import { ExamLandingPage } from "./ExamLandingPage";
import type { PublicExam } from "@/lib/exams/api";

const EXAM: PublicExam = {
  slug: "ctet",
  code: "CTET_P2",
  name: "CTET Paper II",
  description: "Central Teacher Eligibility Test.",
  target_audience: "Aspiring teachers",
  exam_date: "2026-12-01",
  status: "published",
  overview: {
    mode: "Offline (OMR)",
    duration_minutes: 150,
    total_questions: 150,
    total_marks: 150,
    negative_marking: false,
  },
  syllabus_summary: [
    { subject: "Science", topic_count: 5 },
    { subject: "Mathematics", topic_count: 3 },
  ],
};

afterEach(() => cleanup());

describe("ExamLandingPage", () => {
  it("renders the hero with exam name and description", () => {
    render(<ExamLandingPage exam={EXAM} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "CTET Paper II" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Central Teacher Eligibility Test."),
    ).toBeTruthy();
  });

  it("renders the overview with eligibility and stats", () => {
    render(<ExamLandingPage exam={EXAM} />);
    expect(screen.getByText("overview_title")).toBeTruthy();
    expect(screen.getByText("Aspiring teachers")).toBeTruthy();
    expect(screen.getByText("Offline (OMR)")).toBeTruthy();
    expect(screen.getByText("2026-12-01")).toBeTruthy();
  });

  it("renders the syllabus subjects", () => {
    render(<ExamLandingPage exam={EXAM} />);
    expect(screen.getByText("Science")).toBeTruthy();
    expect(screen.getByText("Mathematics")).toBeTruthy();
    expect(screen.getAllByText("syllabus_topic_count").length).toBe(2);
  });

  it("renders why-prepare cards and FAQ", () => {
    render(<ExamLandingPage exam={EXAM} />);
    expect(screen.getByText("why_1_title")).toBeTruthy();
    expect(screen.getByText("why_3_title")).toBeTruthy();
    expect(screen.getByRole("button", { name: "faq_q1_q" })).toBeTruthy();
  });

  it("points CTAs at /register", () => {
    render(<ExamLandingPage exam={EXAM} />);
    const registerLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/register");
    // hero CTA + closing CTA
    expect(registerLinks.length).toBe(2);
  });

  it("omits overview rows with no value", () => {
    const sparse: PublicExam = {
      ...EXAM,
      target_audience: "",
      exam_date: null,
      overview: {
        mode: "",
        duration_minutes: null,
        total_questions: null,
        total_marks: null,
        negative_marking: null,
      },
    };
    render(<ExamLandingPage exam={sparse} />);
    // No overview values → the section title is not rendered.
    expect(screen.queryByText("overview_title")).toBeNull();
  });
});
