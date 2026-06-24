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

import { ExamPapersPage } from "./ExamPapersPage";
import type { ExamPapers } from "@/lib/exams/api";

const DATA: ExamPapers = {
  exam: { slug: "ctet", name: "CTET Paper II" },
  papers: [
    { id: "p1", year: 2024, title: "2024 Question Paper", question_count: 150, available: true },
    { id: "p2", year: 2023, title: "2023 Question Paper", question_count: 0, available: false },
  ],
};

afterEach(() => cleanup());

describe("ExamPapersPage", () => {
  it("renders the hero with the exam name", () => {
    render(<ExamPapersPage data={DATA} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "CTET Paper II" }),
    ).toBeTruthy();
  });

  it("lists each paper with availability", () => {
    render(<ExamPapersPage data={DATA} />);
    expect(screen.getByText("2024 Question Paper")).toBeTruthy();
    expect(screen.getByText("2023 Question Paper")).toBeTruthy();
    expect(screen.getByText("available")).toBeTruthy();
    expect(screen.getByText("unavailable")).toBeTruthy();
  });

  it("renders benefits and FAQ", () => {
    render(<ExamPapersPage data={DATA} />);
    expect(screen.getByText("benefit_1_title")).toBeTruthy();
    expect(screen.getByRole("button", { name: "faq_q1_q" })).toBeTruthy();
  });

  it("points the CTA at /register", () => {
    render(<ExamPapersPage data={DATA} />);
    expect(
      screen.getByRole("link", { name: "cta_button" }).getAttribute("href"),
    ).toBe("/register");
  });

  it("shows an empty state when there are no papers", () => {
    render(
      <ExamPapersPage
        data={{ exam: { slug: "x", name: "X" }, papers: [] }}
      />,
    );
    expect(screen.getByText("empty_title")).toBeTruthy();
    expect(screen.queryByText("2024 Question Paper")).toBeNull();
  });
});
