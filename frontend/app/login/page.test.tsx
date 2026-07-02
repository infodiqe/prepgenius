// @vitest-environment jsdom
//
// SPRINT-5A-01 — login must succeed on the FIRST attempt.
//
// Regression guard for the "login twice" defect: the handler used to fetch the
// profile via a standalone getProfile() purely for routing and never hydrated
// AuthContext, so the destination's RoleGuard read a stale null user and bounced
// back to /login. These tests assert the handler hydrates the context
// (refreshProfile) BEFORE navigating, and routes by role.

import React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import LoginPage from "./page";

const spies = vi.hoisted(() => ({
  login: vi.fn(),
  refreshProfile: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

// Identity translator so we can assert against i18n keys.
vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => "en",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: spies.push, refresh: spies.refresh }),
}));
vi.mock("@/features/auth/authService", () => ({
  login: spies.login,
}));
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ refreshProfile: spies.refreshProfile }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  spies.login.mockReset().mockResolvedValue({ detail: "ok" });
  spies.refreshProfile.mockReset().mockResolvedValue({ roles: ["student"] });
  spies.push.mockReset();
  spies.refresh.mockReset();
});

function fillAndSubmit(email = "user@example.com", password = "password123") {
  fireEvent.change(screen.getByLabelText("email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "login" }));
}

describe("LoginPage — first-attempt success (SPRINT-5A-01)", () => {
  it("hydrates the auth context BEFORE navigating (no second login needed)", async () => {
    vi.useFakeTimers();
    render(<LoginPage />);
    fillAndSubmit();

    // Flush the awaited login + refreshProfile microtasks and the 1s delay.
    await vi.advanceTimersByTimeAsync(1000);

    expect(spies.login).toHaveBeenCalledTimes(1);
    // The context is hydrated from the authenticated session — this is the fix.
    expect(spies.refreshProfile).toHaveBeenCalledTimes(1);
    // And it happens before the navigation that mounts the guarded route.
    expect(
      spies.refreshProfile.mock.invocationCallOrder[0],
    ).toBeLessThan(spies.push.mock.invocationCallOrder[0]);
  });

  it("routes a student to /dashboard and refreshes server state", async () => {
    vi.useFakeTimers();
    spies.refreshProfile.mockResolvedValue({ roles: ["student"] });
    render(<LoginPage />);
    fillAndSubmit();
    await vi.advanceTimersByTimeAsync(1000);

    expect(spies.push).toHaveBeenCalledWith("/dashboard");
    expect(spies.refresh).toHaveBeenCalledTimes(1);
  });

  // SPRINT-5A-01B: operational roles start in the Operations Platform (/ops),
  // a JWT-authenticated Next route — NOT Django Admin (which would force a
  // second, session-based login). All ops-access roles route via the client
  // router, never window.location.
  it.each([["platform_admin"], ["content_manager"], ["content_reviewer"], ["sme"]])(
    "routes an operational role (%s) to /ops via the client router",
    async (role) => {
      vi.useFakeTimers();
      spies.refreshProfile.mockResolvedValue({ roles: [role] });
      render(<LoginPage />);
      fillAndSubmit();
      await vi.advanceTimersByTimeAsync(1000);

      expect(spies.push).toHaveBeenCalledWith("/ops");
      expect(spies.push).not.toHaveBeenCalledWith("/dashboard");
      expect(spies.refresh).toHaveBeenCalledTimes(1);
    },
  );

  it("does not navigate when login fails (stays on the login page)", async () => {
    spies.login.mockRejectedValue(new Error("Invalid credentials"));
    render(<LoginPage />);
    fillAndSubmit();

    // Real timers + async query: the error surfaces after the rejected await.
    expect(await screen.findByText("Invalid credentials")).toBeTruthy();
    expect(spies.refreshProfile).not.toHaveBeenCalled();
    expect(spies.push).not.toHaveBeenCalled();
  });
});
