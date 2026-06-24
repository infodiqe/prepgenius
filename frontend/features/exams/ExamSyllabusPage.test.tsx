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

import { ExamSyllabusPage } from "./ExamSyllabusPage";
import type { ExamSyllabus } from "@/lib/exams/api";

const SYLLABUS: ExamSyllabus = {
  exam: { slug: "ctet", name: "CTET Paper II" },
  subjects: [
    {
      id: "s1",
      name: "Science",
      position: 1,
      topics: [
        {
          id: "t1",
          name: "Physics",
          position: 1,
          subtopics: [
            { id: "st1", name: "Motion", position: 1 },
            { id: "st2", name: "Force", position: 2 },
          ],
        },
      ],
    },
    { id: "s2", name: "Mathematics", position: 2, topics: [] },
  ],
};

afterEach(() => cleanup());

describe("ExamSyllabusPage", () => {
  it("renders the hero with the exam name", () => {
    render(<ExamSyllabusPage syllabus={SYLLABUS} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "CTET Paper II" }),
    ).toBeTruthy();
  });

  it("renders subject navigation linking to subject anchors", () => {
    render(<ExamSyllabusPage syllabus={SYLLABUS} />);
    const nav = screen.getByRole("navigation", { name: "nav_title" });
    expect(nav).toBeTruthy();
    const links = screen.getAllByRole("link", { name: "Science" });
    expect(links.some((l) => l.getAttribute("href") === "#subject-s1")).toBe(
      true,
    );
  });

  it("renders subjects as accordion items with topics", () => {
    render(<ExamSyllabusPage syllabus={SYLLABUS} />);
    expect(screen.getByRole("button", { name: "Science" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mathematics" })).toBeTruthy();
    // First subject is open by default → its topic is visible.
    expect(screen.getByText("Physics")).toBeTruthy();
  });

  it("renders subtopics for the open subject", () => {
    render(<ExamSyllabusPage syllabus={SYLLABUS} />);
    expect(screen.getByText("Motion")).toBeTruthy();
    expect(screen.getByText("Force")).toBeTruthy();
  });

  it("points the CTA at /register", () => {
    render(<ExamSyllabusPage syllabus={SYLLABUS} />);
    expect(
      screen.getByRole("link", { name: "cta_button" }).getAttribute("href"),
    ).toBe("/register");
  });

  it("shows an empty state when there are no subjects", () => {
    render(
      <ExamSyllabusPage
        syllabus={{ exam: { slug: "x", name: "X" }, subjects: [] }}
      />,
    );
    expect(screen.getByText("empty_title")).toBeTruthy();
    expect(
      screen.queryByRole("navigation", { name: "nav_title" }),
    ).toBeNull();
  });
});
