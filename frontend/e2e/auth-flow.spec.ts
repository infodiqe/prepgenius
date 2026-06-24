import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * SPRINT-5A-01 — Authentication Flow Hardening: real-browser validation.
 *
 * The defect: after a successful login the client AuthContext was never
 * hydrated, so the destination's RoleGuard read a stale `null` user and bounced
 * the user back to /login — i.e. login appeared to require a second attempt.
 *
 * The fix routes login through AuthContext.refreshProfile() so the context is
 * populated BEFORE navigation. These specs assert the user-visible contract of
 * that fix in a real browser:
 *
 *   1. Student login succeeds on the FIRST attempt (no bounce to /login).
 *   2. Admin/operational login lands in the Operations Platform (/ops) on the
 *      FIRST attempt — never Django Admin, never onboarding (SPRINT-5A-01B).
 *   3. Logout returns to /login and clears the session.
 *   4. Re-login works immediately.
 *   5. Refreshing a protected route keeps the session.
 *   6. Direct navigation to a protected route is allowed when authenticated.
 *
 * Credentials are supplied via env (see e2e/README.md). No secrets are committed.
 */

const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL ?? "student@example.com",
  password: process.env.E2E_STUDENT_PASSWORD ?? "Password123!",
};
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@example.com",
  password: process.env.E2E_ADMIN_PASSWORD ?? "Password123!",
};

const LOGIN_PATH = "/login";
// The login handler waits ~1s (success toast) before navigating, then the
// client guards run — give the post-login redirect generous headroom.
const POST_LOGIN_TIMEOUT = 15_000;

/** Pin locale to English so labels/text are stable regardless of the AS default. */
async function pinEnglishLocale(context: BrowserContext, baseURL: string) {
  await context.addCookies([
    { name: "locale", value: "en", url: baseURL },
  ]);
}

/** Drive the real login form. Does NOT assert the destination — callers do. */
async function submitLogin(page: Page, creds: { email: string; password: string }) {
  await page.goto(LOGIN_PATH);
  // Stable selectors: the inputs carry ids and the button is the only submit.
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.locator('button[type="submit"]').click();
}

/** True once the browser is on an authenticated (non-/login) route. */
async function waitUntilAuthenticated(page: Page) {
  await page.waitForURL(
    (url) => !url.pathname.startsWith(LOGIN_PATH),
    { timeout: POST_LOGIN_TIMEOUT },
  );
}

async function hasAccessCookie(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  return cookies.some((c) => c.name === "access_token" && !!c.value);
}

test.beforeEach(async ({ context, baseURL }) => {
  await pinEnglishLocale(context, baseURL ?? "http://localhost");
});

test.describe("SPRINT-5A-01 — authentication flow", () => {
  test("1. Student login succeeds on the first attempt", async ({ page, context }) => {
    await submitLogin(page, STUDENT);
    await waitUntilAuthenticated(page);

    // The session cookie was issued and accepted...
    expect(await hasAccessCookie(context)).toBe(true);
    // ...and the user landed in the authenticated app, NOT back on /login.
    // An onboarded student lands on /dashboard; a brand-new one is sent to
    // /onboarding — both are valid "logged-in" destinations and prove the fix.
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

    // Regression guard: the old bug bounced the user to /login a moment after
    // landing. Confirm we stay authenticated and the login form is gone.
    await page.waitForTimeout(2_000);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("#password")).toHaveCount(0);
  });

  test("2. Admin login lands in the Operations Platform on the first attempt", async ({ page, context }) => {
    await submitLogin(page, ADMIN);

    // Operational users start in /ops — a JWT-authenticated Next route — so the
    // JWT session carries over and NO second login is required. We must NOT be
    // sent to Django Admin (/admin/) nor to student onboarding/target-exam.
    await page.waitForURL(/\/ops(\/|$)/, { timeout: POST_LOGIN_TIMEOUT });
    expect(await hasAccessCookie(context)).toBe(true);
    await expect(page).toHaveURL(/\/ops(\/|$)/);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/onboarding/);

    // Regression guard: stay in /ops, do not bounce out a moment later.
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/ops(\/|$)/);

    // NOTE: Django Admin (/admin/) remains reachable directly as a maintenance
    // escape-hatch; it uses Django session auth and is intentionally NOT the
    // login destination. That is by design for SPRINT-5A-01B.
  });

  test("3. Logout returns to /login and clears the session", async ({ page, context }) => {
    await submitLogin(page, STUDENT);
    await waitUntilAuthenticated(page);

    // Open the user menu in the top bar, then click Logout.
    await page.getByRole("button", { name: "User profile menu" }).click();
    await page.getByRole("menuitem", { name: /logout/i }).click();

    await page.waitForURL(/\/login/, { timeout: POST_LOGIN_TIMEOUT });
    await expect(page).toHaveURL(/\/login/);
    // Session cookie cleared by the backend logout.
    expect(await hasAccessCookie(context)).toBe(false);
  });

  test("4. Re-login after logout works immediately", async ({ page, context }) => {
    // Log in, log out, then log in again — the second login must also be
    // first-attempt (no lingering stale state from the previous session).
    await submitLogin(page, STUDENT);
    await waitUntilAuthenticated(page);
    await page.getByRole("button", { name: "User profile menu" }).click();
    await page.getByRole("menuitem", { name: /logout/i }).click();
    await page.waitForURL(/\/login/, { timeout: POST_LOGIN_TIMEOUT });

    await submitLogin(page, STUDENT);
    await waitUntilAuthenticated(page);
    expect(await hasAccessCookie(context)).toBe(true);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  });

  test("5. Refreshing a protected route keeps the session", async ({ page, context }) => {
    await submitLogin(page, STUDENT);
    await waitUntilAuthenticated(page);
    const urlBeforeReload = page.url();

    await page.reload();

    // Session survives a hard refresh (SSR re-seeds the user from the cookie);
    // the guard must NOT redirect to /login.
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(new URL(urlBeforeReload).pathname);
    expect(await hasAccessCookie(context)).toBe(true);
  });

  test("6. Direct navigation to a protected route is allowed when authenticated", async ({ page, context }) => {
    await submitLogin(page, STUDENT);
    await waitUntilAuthenticated(page);

    // New tab in the SAME context (shares cookies) — simulates pasting a deep
    // link into a fresh tab while logged in.
    const newPage = await context.newPage();
    await newPage.goto("/profile");

    await expect(newPage).not.toHaveURL(/\/login/);
    await expect(newPage).toHaveURL(/\/profile/);
    await newPage.close();
  });
});
