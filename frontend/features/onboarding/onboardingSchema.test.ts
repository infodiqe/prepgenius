import { describe, expect, it } from "vitest";
import { buildOnboardingSchema, todayIso } from "./onboardingSchema";

// Identity translator: assertions check the i18n *key* that was selected.
const t = (k: string) => k;
// Fixed "now" so the past-date rule is deterministic.
const now = new Date("2026-06-19T09:00:00");
const schema = buildOnboardingSchema(t, now);

const valid = {
  target_exam_id: "11111111-1111-1111-1111-111111111111",
  exam_date: "2026-12-01",
};

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

describe("onboardingSchema", () => {
  it("accepts a valid exam + future date", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("accepts today's date (boundary)", () => {
    expect(
      schema.safeParse({ ...valid, exam_date: todayIso(now) }).success,
    ).toBe(true);
  });

  it("requires a target exam", () => {
    expect(errorsFor({ ...valid, target_exam_id: "" }).target_exam_id).toBe(
      "val_exam_required",
    );
  });

  it("requires an exam date", () => {
    expect(errorsFor({ ...valid, exam_date: "" }).exam_date).toBe(
      "val_date_required",
    );
  });

  it("rejects a past exam date", () => {
    expect(errorsFor({ ...valid, exam_date: "2020-01-01" }).exam_date).toBe(
      "val_date_past",
    );
  });
});

describe("todayIso", () => {
  it("formats a date as zero-padded YYYY-MM-DD", () => {
    expect(todayIso(new Date("2026-02-05T10:00:00"))).toBe("2026-02-05");
  });
});
