import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchExamPapers,
  fetchExamSyllabus,
  fetchPublicExam,
  fetchPublicExams,
} from "./api";

afterEach(() => vi.restoreAllMocks());

describe("fetchExamPapers", () => {
  it("returns papers on a 200 response", async () => {
    const data = { exam: { slug: "ctet", name: "CTET" }, papers: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
    );
    expect(await fetchExamPapers("ctet")).toEqual(data);
  });

  it("returns null on a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await fetchExamPapers("missing")).toBeNull();
  });

  it("returns null when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchExamPapers("ctet")).toBeNull();
  });
});

describe("fetchExamSyllabus", () => {
  it("returns the syllabus on a 200 response", async () => {
    const syllabus = { exam: { slug: "ctet", name: "CTET" }, subjects: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => syllabus }),
    );
    expect(await fetchExamSyllabus("ctet")).toEqual(syllabus);
  });

  it("returns null on a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await fetchExamSyllabus("missing")).toBeNull();
  });

  it("returns null when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchExamSyllabus("ctet")).toBeNull();
  });
});

describe("fetchPublicExam", () => {
  it("returns the exam on a 200 response", async () => {
    const exam = { slug: "ctet", name: "CTET" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => exam }),
    );
    expect(await fetchPublicExam("ctet")).toEqual(exam);
  });

  it("returns null on a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await fetchPublicExam("missing")).toBeNull();
  });

  it("returns null when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchPublicExam("ctet")).toBeNull();
  });
});

describe("fetchPublicExams", () => {
  it("returns the list on success", async () => {
    const list = [{ slug: "ctet", code: "C", name: "CTET", updated_at: "x" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => list }),
    );
    expect(await fetchPublicExams()).toEqual(list);
  });

  it("returns [] on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchPublicExams()).toEqual([]);
  });
});
