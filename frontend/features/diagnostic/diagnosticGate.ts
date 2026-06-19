/*
 * Diagnostic visibility gate (SPR1-HOTFIX-02).
 *
 * The dashboard renders the DiagnosticCard only when the exam's `blueprint`
 * JSON (typed `unknown` in the generated client) carries a string
 * `diagnostic_mock_test_id`. Kept in its own module (not the route file) so it
 * is importable/testable — Next.js route files may only export reserved names.
 */
export function readDiagnosticMockTestId(blueprint: unknown): string | null {
  if (blueprint && typeof blueprint === "object" && !Array.isArray(blueprint)) {
    const value = (blueprint as Record<string, unknown>)[
      "diagnostic_mock_test_id"
    ];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}
