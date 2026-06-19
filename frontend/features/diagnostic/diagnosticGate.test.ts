import { describe, expect, it } from "vitest";
import { readDiagnosticMockTestId } from "./diagnosticGate";

/**
 * SPR1-HOTFIX-02 — the dashboard renders the DiagnosticCard only when the exam
 * blueprint carries a `diagnostic_mock_test_id`. This is the gating predicate.
 */
describe("readDiagnosticMockTestId (dashboard diagnostic gate)", () => {
  it("returns the id when present (card shows)", () => {
    expect(
      readDiagnosticMockTestId({ diagnostic_mock_test_id: "mt-123" }),
    ).toBe("mt-123");
  });

  it("preserves other blueprint keys (only reads the one it needs)", () => {
    expect(
      readDiagnosticMockTestId({
        total_marks: 150,
        diagnostic_mock_test_id: "mt-123",
      }),
    ).toBe("mt-123");
  });

  it("returns null when the key is absent (card hidden)", () => {
    expect(readDiagnosticMockTestId({ total_marks: 150 })).toBeNull();
  });

  it.each([undefined, null, {}, [], "str", 42, { diagnostic_mock_test_id: "" }])(
    "returns null for non-configuring blueprint: %s",
    (value) => {
      expect(readDiagnosticMockTestId(value)).toBeNull();
    },
  );
});
