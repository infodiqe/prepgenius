import { describe, expect, it } from "vitest";
import { buildRegistrationSchema } from "./registrationSchema";

// Identity translator: assertions check the i18n *key* that was selected.
const t = (k: string) => k;
const schema = buildRegistrationSchema(t);

const valid = {
  full_name: "Student Name",
  email: "user@example.com",
  phone_e164: "+919812345678",
  password: "password123",
  password_confirm: "password123",
  preferred_language: "as" as const,
  consent: true,
};

/** Collect zod issues keyed by field path for easy assertions. */
function errorsFor(input: unknown): Record<string, string> {
  const result = schema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    // Keep the first issue per field (matches the order rules are declared).
    if (!(path in out)) out[path] = issue.message;
  }
  return out;
}

describe("registrationSchema — happy path", () => {
  it("accepts a fully valid payload", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("accepts a payload with no phone (optional)", () => {
    const { phone_e164, ...rest } = valid;
    expect(schema.safeParse(rest).success).toBe(true);
  });

  it("trims whitespace from name and email", () => {
    const parsed = schema.parse({
      ...valid,
      full_name: "  Student Name  ",
      email: "  user@example.com  ",
    });
    expect(parsed.full_name).toBe("Student Name");
    expect(parsed.email).toBe("user@example.com");
  });
});

describe("registrationSchema — field validation", () => {
  it("requires full_name", () => {
    expect(errorsFor({ ...valid, full_name: "   " }).full_name).toBe(
      "val_name_required",
    );
  });

  it("requires email and rejects malformed addresses", () => {
    expect(errorsFor({ ...valid, email: "" }).email).toBe("val_email_required");
    expect(errorsFor({ ...valid, email: "not-an-email" }).email).toBe(
      "val_email_invalid",
    );
  });

  it("requires a password of at least 8 characters", () => {
    expect(errorsFor({ ...valid, password: "" }).password).toBe(
      "val_password_required",
    );
    expect(errorsFor({ ...valid, password: "short" }).password).toBe(
      "val_password_min",
    );
  });

  it("rejects an invalid phone but allows a blank/omitted one", () => {
    expect(errorsFor({ ...valid, phone_e164: "12345" }).phone_e164).toBe(
      "val_phone_invalid",
    );
    expect(errorsFor({ ...valid, phone_e164: "" }).phone_e164).toBeUndefined();
  });

  it("flags mismatched passwords on the confirm field", () => {
    expect(
      errorsFor({ ...valid, password_confirm: "different1" }).password_confirm,
    ).toBe("passwords_do_not_match");
  });

  it("rejects an unsupported preferred_language", () => {
    expect(
      errorsFor({ ...valid, preferred_language: "fr" }).preferred_language,
    ).toBeTruthy();
  });

  it("requires consent to be explicitly accepted (T06)", () => {
    expect(errorsFor({ ...valid, consent: false }).consent).toBe(
      "val_consent_required",
    );
    // Missing consent is also rejected — the gate cannot be bypassed.
    const { consent, ...withoutConsent } = valid;
    expect(schema.safeParse(withoutConsent).success).toBe(false);
  });
});
