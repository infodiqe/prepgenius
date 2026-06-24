import { afterEach, describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  fetchExamPapers: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/exams/api", () => ({ fetchExamPapers: spies.fetchExamPapers }));
vi.mock("next/navigation", () => ({ notFound: spies.notFound }));
vi.mock("@/features/marketing/PublicHeader", () => ({ PublicHeader: () => null }));
vi.mock("@/features/marketing/PublicFooter", () => ({ PublicFooter: () => null }));
vi.mock("@/features/exams/ExamPapersPage", () => ({ ExamPapersPage: () => null }));

import ExamPreviousYearPapers, { generateMetadata } from "./page";

afterEach(() => {
  spies.fetchExamPapers.mockReset();
  spies.notFound.mockClear();
});

describe("ExamPreviousYearPapers page", () => {
  it("calls notFound() when the exam is missing or inactive", async () => {
    spies.fetchExamPapers.mockResolvedValue(null);
    await expect(
      ExamPreviousYearPapers({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(spies.notFound).toHaveBeenCalledTimes(1);
  });

  it("renders when papers data exists", async () => {
    spies.fetchExamPapers.mockResolvedValue({
      exam: { slug: "ctet", name: "CTET" },
      papers: [],
    });
    const result = await ExamPreviousYearPapers({
      params: Promise.resolve({ slug: "ctet" }),
    });
    expect(result).toBeTruthy();
    expect(spies.notFound).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("builds the '<Exam> Previous Year Papers' canonical metadata", async () => {
    spies.fetchExamPapers.mockResolvedValue({
      exam: { slug: "ctet", name: "CTET Paper II" },
      papers: [],
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "ctet" }),
    });
    expect(meta.title).toBe("CTET Paper II Previous Year Papers");
    expect((meta.alternates as { canonical?: string }).canonical).toBe(
      "/exams/ctet/previous-year-papers",
    );
  });

  it("returns empty metadata when the exam is missing", async () => {
    spies.fetchExamPapers.mockResolvedValue(null);
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(meta).toEqual({});
  });
});
