import { afterEach, describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  fetchExamSyllabus: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/exams/api", () => ({
  fetchExamSyllabus: spies.fetchExamSyllabus,
}));
vi.mock("next/navigation", () => ({ notFound: spies.notFound }));
vi.mock("@/features/marketing/PublicHeader", () => ({ PublicHeader: () => null }));
vi.mock("@/features/marketing/PublicFooter", () => ({ PublicFooter: () => null }));
vi.mock("@/features/exams/ExamSyllabusPage", () => ({
  ExamSyllabusPage: () => null,
}));

import ExamSyllabus, { generateMetadata } from "./page";

afterEach(() => {
  spies.fetchExamSyllabus.mockReset();
  spies.notFound.mockClear();
});

describe("ExamSyllabus page", () => {
  it("calls notFound() when the exam is missing or inactive", async () => {
    spies.fetchExamSyllabus.mockResolvedValue(null);
    await expect(
      ExamSyllabus({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(spies.notFound).toHaveBeenCalledTimes(1);
  });

  it("renders when the syllabus exists", async () => {
    spies.fetchExamSyllabus.mockResolvedValue({
      exam: { slug: "ctet", name: "CTET" },
      subjects: [],
    });
    const result = await ExamSyllabus({
      params: Promise.resolve({ slug: "ctet" }),
    });
    expect(result).toBeTruthy();
    expect(spies.notFound).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("builds the '<Exam> Syllabus' canonical metadata", async () => {
    spies.fetchExamSyllabus.mockResolvedValue({
      exam: { slug: "ctet", name: "CTET Paper II" },
      subjects: [],
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "ctet" }),
    });
    expect(meta.title).toBe("CTET Paper II Syllabus");
    expect((meta.alternates as { canonical?: string }).canonical).toBe(
      "/exams/ctet/syllabus",
    );
  });

  it("returns empty metadata when the exam is missing", async () => {
    spies.fetchExamSyllabus.mockResolvedValue(null);
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(meta).toEqual({});
  });
});
