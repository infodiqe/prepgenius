import { describe, it, expect } from "vitest";
import { resolveErrorMessage } from "./resolveMessage";
import { normalizeError } from "./normalize";
import { ApiError } from "./ApiError";

describe("resolveErrorMessage", () => {
  it("resolves via the injected translator using the category message key", () => {
    const t = (key: string) => `translated:${key}`;
    const err = normalizeError(new ApiError(429, {}));
    expect(resolveErrorMessage(err, t)).toBe("translated:rateLimit");
  });

  it("maps categories to their i18n leaf keys", () => {
    const t = (key: string) => key;
    expect(resolveErrorMessage(normalizeError(new ApiError(403, {})), t)).toBe(
      "authorization",
    );
    expect(resolveErrorMessage(normalizeError(new ApiError(404, {})), t)).toBe(
      "notFound",
    );
    expect(
      resolveErrorMessage(normalizeError(new TypeError("Failed to fetch")), t),
    ).toBe("network");
  });
});
