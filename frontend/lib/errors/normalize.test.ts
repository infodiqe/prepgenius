import { describe, it, expect } from "vitest";
import { normalizeError } from "./normalize";
import { ApiError } from "./ApiError";

describe("normalizeError — ApiError by status", () => {
  it.each([
    [400, "validation"],
    [401, "authentication"],
    [403, "authorization"],
    [404, "not_found"],
    [409, "conflict"],
    [423, "lockout"],
    [429, "rate_limit"],
    [500, "server"],
  ] as const)("status %i → category %s", (status, category) => {
    const e = normalizeError(new ApiError(status, { detail: "x" }));
    expect(e.category).toBe(category);
    expect(e.code).toBe(category);
    expect(e.status).toBe(status);
    expect(e.messageKey).toBeTruthy();
  });

  it("ApiError(null) → network", () => {
    expect(normalizeError(new ApiError(null)).category).toBe("network");
  });

  it("extracts DRF field errors from a 400 payload (ignoring `detail`)", () => {
    const e = normalizeError(
      new ApiError(400, { email: ["already taken"], detail: "bad" }),
    );
    expect(e.fieldErrors).toEqual({ email: ["already taken"] });
  });

  it("normalizes a single-string field error to an array", () => {
    const e = normalizeError(new ApiError(400, { password: "too short" }));
    expect(e.fieldErrors).toEqual({ password: ["too short"] });
  });
});

describe("normalizeError — response-like / status objects", () => {
  it("classifies an object carrying a numeric status", () => {
    expect(normalizeError({ status: 403, data: {} }).category).toBe(
      "authorization",
    );
  });

  it("non-numeric status → unknown", () => {
    const e = normalizeError({ status: "weird" });
    expect(e.category).toBe("unknown");
    expect(e.status).toBeNull();
  });

  it("plain object without status → unknown but keeps field errors", () => {
    const e = normalizeError({ password: ["too short"] });
    expect(e.category).toBe("unknown");
    expect(e.fieldErrors).toEqual({ password: ["too short"] });
  });
});

describe("normalizeError — network and malformed", () => {
  it("fetch TypeError → network", () => {
    expect(normalizeError(new TypeError("Failed to fetch")).category).toBe(
      "network",
    );
  });

  it("generic Error → unknown", () => {
    const e = normalizeError(new Error("boom"));
    expect(e.category).toBe("unknown");
    expect(e.status).toBeNull();
  });

  it.each([null, undefined, "oops", 42, []])(
    "malformed input (%s) → unknown with null status",
    (raw) => {
      const e = normalizeError(raw);
      expect(e.category).toBe("unknown");
      expect(e.status).toBeNull();
    },
  );

  it("always retains rawPayload and never throws", () => {
    const raw = new ApiError(500, { detail: "x" });
    expect(normalizeError(raw).rawPayload).toBe(raw);
    expect(() => normalizeError(Symbol("weird") as unknown)).not.toThrow();
  });
});
