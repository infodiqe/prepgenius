import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the SPRINT-5A-01 authentication-flow validation.
 *
 * Runs against a RUNNING stack (Docker Compose behind nginx), not a dev server —
 * so there is no `webServer` block. Point E2E_BASE_URL at whatever serves the
 * app; in local dev that is nginx on http://localhost (port 80).
 *
 * Auth is the system under test, so storage state is intentionally NOT shared
 * across tests — every scenario starts from a clean context and drives the real
 * login UI. Tests run serially (workers: 1) because they share one set of
 * backend accounts and we assert on redirect/session behaviour.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost",
    // The dev stack is HTTP-only with a self-signed/none cert; ignore TLS errors
    // so the same suite works against an HTTPS prod URL too.
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
