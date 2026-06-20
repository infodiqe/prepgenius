import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn().mockResolvedValue({ id: "attempt-1" }),
}));

import { apiRequest } from "@/lib/api/client";
import { createPracticeAttempt } from "./attemptService";

describe("createPracticeAttempt (T28)", () => {
  beforeEach(() => vi.mocked(apiRequest).mockClear());

  it("POSTs topic scope to the practice endpoint", async () => {
    await createPracticeAttempt({
      exam_id: "exam-1",
      scope_type: "topic",
      scope_id: "topic-1",
    });
    expect(apiRequest).toHaveBeenCalledWith("/attempts/practice/", {
      method: "POST",
      body: { exam_id: "exam-1", scope_type: "topic", scope_id: "topic-1" },
    });
  });

  it("POSTs mixed scope without a scope_id", async () => {
    await createPracticeAttempt({ exam_id: "exam-1", scope_type: "mixed" });
    expect(apiRequest).toHaveBeenCalledWith("/attempts/practice/", {
      method: "POST",
      body: { exam_id: "exam-1", scope_type: "mixed" },
    });
  });

  it("returns the created attempt", async () => {
    const result = await createPracticeAttempt({
      exam_id: "exam-1",
      scope_type: "subject",
      scope_id: "subject-1",
    });
    expect(result).toEqual({ id: "attempt-1" });
  });
});
