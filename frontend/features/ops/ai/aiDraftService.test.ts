import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("../exams/examService", () => ({
  listExams: vi.fn(),
  getExamTree: vi.fn(),
}));

import { apiRequest } from "@/lib/api/client";
import {
  anyJobActive,
  classifyPhase,
  discardAiDraft,
  flattenSubtopics,
  formatDuration,
  importAiDraft,
  jobIsActive,
  jobRemaining,
  listAiDrafts,
  type AiGenerationJob,
} from "./aiDraftService";

const mockApi = apiRequest as unknown as ReturnType<typeof vi.fn>;

afterEach(() => vi.clearAllMocks());

function job(over: Partial<AiGenerationJob> = {}): AiGenerationJob {
  return {
    id: "j1",
    status: "running",
    progress: 50,
    requested_count: 10,
    generated_count: 4,
    failed_count: 1,
    provider: "groq",
    model: "llama",
    error_message: "",
    duration_seconds: null,
    started_at: null,
    completed_at: null,
    created_at: "2026-07-02T10:00:00Z",
    ...over,
  };
}

describe("classifyPhase", () => {
  it("maps 403/401/other", () => {
    expect(classifyPhase(new ApiError(403))).toBe("forbidden");
    expect(classifyPhase(new ApiError(401))).toBe("unauthorized");
    expect(classifyPhase(new Error("boom"))).toBe("error");
  });
});

describe("job helpers", () => {
  it("jobIsActive / anyJobActive", () => {
    expect(jobIsActive(job({ status: "running" }))).toBe(true);
    expect(jobIsActive(job({ status: "pending" }))).toBe(true);
    expect(jobIsActive(job({ status: "completed" }))).toBe(false);
    expect(anyJobActive([job({ status: "completed" }), job({ status: "pending" })])).toBe(true);
    expect(anyJobActive([job({ status: "completed" })])).toBe(false);
  });

  it("jobRemaining never negative", () => {
    expect(jobRemaining(job({ requested_count: 10, generated_count: 4, failed_count: 1 }))).toBe(5);
    expect(jobRemaining(job({ requested_count: 2, generated_count: 5, failed_count: 0 }))).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats seconds and minutes", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(5)).toBe("5.0s");
    expect(formatDuration(90)).toBe("1m 30s");
  });
});

describe("flattenSubtopics", () => {
  it("flattens tree into subtopic choices", () => {
    const tree = {
      id: "e",
      code: "C",
      name: "CTET",
      exam_type: "q",
      audience_is_minor: false,
      is_active: true,
      created_at: "",
      updated_at: "",
      subjects: [
        { id: "s", name: "Maths", position: 0, topics: [
          { id: "t", name: "Fractions", position: 0, subtopics: [
            { id: "st", name: "Proper", position: 0 },
          ] },
        ] },
      ],
    };
    const flat = flattenSubtopics(tree);
    expect(flat).toEqual([{ id: "st", label: "Maths › Fractions › Proper" }]);
    expect(flattenSubtopics(null)).toEqual([]);
  });
});

describe("API calls build correct requests", () => {
  it("listAiDrafts serializes params, omitting empties", async () => {
    mockApi.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    await listAiDrafts({ status: "generated", exam: "", search: "frac", limit: 20, offset: 40 });
    const path = mockApi.mock.calls[0][0] as string;
    expect(path).toContain("/ai/questions/drafts/?");
    expect(path).toContain("status=generated");
    expect(path).toContain("search=frac");
    expect(path).toContain("limit=20");
    expect(path).toContain("offset=40");
    expect(path).not.toContain("exam=");
  });

  it("importAiDraft posts body", async () => {
    mockApi.mockResolvedValue({});
    await importAiDraft("d1", { exam_id: "e1", subtopic_id: "s1" });
    expect(mockApi).toHaveBeenCalledWith("/ai/questions/drafts/d1/import/", {
      method: "POST",
      body: { exam_id: "e1", subtopic_id: "s1" },
    });
  });

  it("discardAiDraft posts", async () => {
    mockApi.mockResolvedValue({});
    await discardAiDraft("d1");
    expect(mockApi).toHaveBeenCalledWith("/ai/questions/drafts/d1/discard/", { method: "POST" });
  });
});
