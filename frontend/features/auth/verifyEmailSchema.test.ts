import { describe, expect, it } from "vitest";
import { buildVerifyEmailSchema } from "./verifyEmailSchema";

// Identity translator: assertions check the i18n *key* that was selected.
const t = (k: string) => k;
const schema = buildVerifyEmailSchema(t);

/** Collect zod issues keyed by field path for easy assertions. */
function errorsFor(input: unknown): Record<string, string> {
  const result = schema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!(path in out)) out[path] = issue.message;
  }
  return out;
}

describe("verifyEmailSchema", () => {
  it("accepts a token with an empty email (token-only verify)", () => {
    expect(schema.safeParse({ token: "abc123", email: "" }).success).toBe(true);
  });

  it("accepts a token with a valid email", () => {
    expect(
      schema.safeParse({ token: "abc123", email: "user@example.com" }).success,
    ).toBe(true);
  });

  it("trims the token", () => {
    expect(schema.parse({ token: "  abc  ", email: "" }).token).toBe("abc");
  });

  it("requires a non-empty token", () => {
    expect(errorsFor({ token: "   ", email: "" }).token).toBe(
      "val_token_required",
    );
  });

  it("rejects a malformed (non-empty) email", () => {
    expect(errorsFor({ token: "abc", email: "not-an-email" }).email).toBe(
      "val_email_invalid",
    );
  });
});
