import { describe, it, expect } from "vitest";
import { categorizeStatus, messageKeyForCategory } from "./classify";

describe("categorizeStatus", () => {
  it.each([
    [400, "validation"],
    [401, "authentication"],
    [403, "authorization"],
    [404, "not_found"],
    [409, "conflict"],
    [423, "lockout"],
    [429, "rate_limit"],
    [500, "server"],
    [502, "server"],
    [503, "server"],
  ] as const)("maps %i → %s", (status, category) => {
    expect(categorizeStatus(status)).toBe(category);
  });

  it("maps no-response (null / 0) to network", () => {
    expect(categorizeStatus(null)).toBe("network");
    expect(categorizeStatus(0)).toBe("network");
  });

  it("maps unmapped 4xx to unknown", () => {
    expect(categorizeStatus(402)).toBe("unknown");
    expect(categorizeStatus(418)).toBe("unknown");
  });
});

describe("messageKeyForCategory", () => {
  it("returns camelCase i18n leaf keys", () => {
    expect(messageKeyForCategory("not_found")).toBe("notFound");
    expect(messageKeyForCategory("rate_limit")).toBe("rateLimit");
    expect(messageKeyForCategory("validation")).toBe("validation");
    expect(messageKeyForCategory("unknown")).toBe("unknown");
  });
});
