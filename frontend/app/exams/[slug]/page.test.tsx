import { afterEach, describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  fetchPublicExam: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/exams/api", () => ({ fetchPublicExam: spies.fetchPublicExam }));
vi.mock("next/navigation", () => ({ notFound: spies.notFound }));
vi.mock("@/features/marketing/PublicHeader", () => ({ PublicHeader: () => null }));
vi.mock("@/features/marketing/PublicFooter", () => ({ PublicFooter: () => null }));
vi.mock("@/features/exams/ExamLandingPage", () => ({
  ExamLandingPage: () => null,
}));

import ExamPage, { generateMetadata } from "./page";

afterEach(() => {
  spies.fetchPublicExam.mockReset();
  spies.notFound.mockClear();
});

describe("ExamPage", () => {
  it("calls notFound() when the exam is missing or inactive", async () => {
    spies.fetchPublicExam.mockResolvedValue(null);
    await expect(
      ExamPage({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(spies.notFound).toHaveBeenCalledTimes(1);
  });

  it("renders when the exam exists", async () => {
    spies.fetchPublicExam.mockResolvedValue({ slug: "ctet", name: "CTET" });
    const result = await ExamPage({
      params: Promise.resolve({ slug: "ctet" }),
    });
    expect(result).toBeTruthy();
    expect(spies.notFound).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("builds canonical metadata from the exam", async () => {
    spies.fetchPublicExam.mockResolvedValue({
      slug: "ctet",
      name: "CTET Paper II",
      description: "desc",
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "ctet" }),
    });
    expect(meta.title).toBe("CTET Paper II");
    expect((meta.alternates as { canonical?: string }).canonical).toBe(
      "/exams/ctet",
    );
  });

  it("returns empty metadata when the exam is missing", async () => {
    spies.fetchPublicExam.mockResolvedValue(null);
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(meta).toEqual({});
  });
});
