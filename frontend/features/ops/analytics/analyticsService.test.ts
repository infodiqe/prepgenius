import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import {
  classifyError,
  getOpsContent,
  getOpsCredits,
  getOpsOverview,
  getOpsReadiness,
  getOpsReview,
} from "./analyticsService";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("classifyError (RBAC-aware)", () => {
  it("maps 403 → forbidden, 401 → unauthorized, else → error", () => {
    expect(classifyError(new ApiError(403, {}, "x"))).toBe("forbidden");
    expect(classifyError(new ApiError(401, {}, "x"))).toBe("unauthorized");
    expect(classifyError(new ApiError(500, {}, "x"))).toBe("error");
    expect(classifyError(new Error("boom"))).toBe("error");
  });
});

describe("analyticsService operator reads (OPS-BE-03, no params)", () => {
  function stubFetch(payload: unknown) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it.each([
    ["getOpsOverview", getOpsOverview, "/ops/analytics/overview/"],
    ["getOpsReadiness", getOpsReadiness, "/ops/analytics/readiness/"],
    ["getOpsContent", getOpsContent, "/ops/analytics/content/"],
    ["getOpsReview", getOpsReview, "/ops/analytics/review/"],
    ["getOpsCredits", getOpsCredits, "/ops/analytics/credits/"],
  ])("%s calls %s", async (_name, fn, path) => {
    const f = stubFetch({});
    await (fn as () => Promise<unknown>)();
    expect(f.mock.calls[0][0]).toContain(path as string);
  });
});
