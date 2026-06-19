import { describe, expect, it } from "vitest";
import { resolveCompletionHref } from "./completionHref";

const ID = "att-1";

describe("resolveCompletionHref — SPR1-HOTFIX-02", () => {
  it("defaults to the results page when no flow is present", () => {
    expect(resolveCompletionHref(ID, undefined)).toBe("/results/att-1");
  });

  it("keeps the results page for non-diagnostic flows", () => {
    expect(resolveCompletionHref(ID, "practice")).toBe("/results/att-1");
  });

  it("routes the diagnostic flow to the diagnostic completion screen", () => {
    expect(resolveCompletionHref(ID, "diagnostic")).toBe("/diagnostic/att-1");
  });

  it("does not treat a repeated (array) param as the diagnostic flow", () => {
    // ?flow=diagnostic&flow=x → array; only the exact string marker qualifies.
    expect(resolveCompletionHref(ID, ["diagnostic"])).toBe("/results/att-1");
  });

  it("yields the same destination used for submitted/scored re-entry", () => {
    // The page uses this single value for both the shell prop and the
    // scored/submitted redirects, so re-entry preserves the diagnostic flow.
    const href = resolveCompletionHref(ID, "diagnostic");
    expect(href).toBe("/diagnostic/att-1");
  });
});
