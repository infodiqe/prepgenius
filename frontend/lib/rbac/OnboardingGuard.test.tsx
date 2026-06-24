// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { OnboardingGuard } from "./OnboardingGuard";

const state = vi.hoisted(() => ({
  user: null as { target_exam_id: string | null; roles?: string[] } | null,
  isLoading: false,
  pathname: "/dashboard",
  replace: vi.fn(),
}));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: state.user, isLoading: state.isLoading }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
  usePathname: () => state.pathname,
}));

const protectedChild = <div data-testid="protected">secret</div>;

afterEach(() => {
  cleanup();
  state.user = null;
  state.isLoading = false;
  state.pathname = "/dashboard";
  state.replace.mockClear();
});

describe("OnboardingGuard — redirect on incomplete onboarding", () => {
  it("redirects to /onboarding and hides children when target_exam_id is null", () => {
    state.user = { target_exam_id: null };
    state.pathname = "/dashboard";
    const { queryByTestId } = render(
      <OnboardingGuard>{protectedChild}</OnboardingGuard>,
    );
    expect(state.replace).toHaveBeenCalledWith("/onboarding");
    expect(queryByTestId("protected")).toBeNull();
  });

  it("renders the fallback (not children) while the redirect is pending", () => {
    state.user = { target_exam_id: null };
    state.pathname = "/dashboard";
    const { queryByTestId } = render(
      <OnboardingGuard fallback={<div data-testid="loading" />}>
        {protectedChild}
      </OnboardingGuard>,
    );
    expect(queryByTestId("loading")).toBeTruthy();
    expect(queryByTestId("protected")).toBeNull();
  });
});

describe("OnboardingGuard — operational users are exempt (SPRINT-5A-01B)", () => {
  // Operational roles legitimately have no target exam and belong in /ops, so
  // they must NEVER be forced into student onboarding / target-exam selection.
  it.each([["platform_admin"], ["content_manager"], ["content_reviewer"], ["sme"], ["institution_admin"]])(
    "does not redirect an ops user (%s) with a null target_exam_id",
    (role) => {
      state.user = { target_exam_id: null, roles: [role] };
      state.pathname = "/dashboard";
      const { queryByTestId } = render(
        <OnboardingGuard>{protectedChild}</OnboardingGuard>,
      );
      expect(state.replace).not.toHaveBeenCalled();
      expect(queryByTestId("protected")).toBeTruthy();
    },
  );

  it("still redirects a plain student (no ops roles) with a null target_exam_id", () => {
    state.user = { target_exam_id: null, roles: ["student"] };
    state.pathname = "/dashboard";
    const { queryByTestId } = render(
      <OnboardingGuard>{protectedChild}</OnboardingGuard>,
    );
    expect(state.replace).toHaveBeenCalledWith("/onboarding");
    expect(queryByTestId("protected")).toBeNull();
  });
});

describe("OnboardingGuard — allow navigation when onboarding is complete", () => {
  it("renders children and does not redirect when target_exam_id is present", () => {
    state.user = { target_exam_id: "11111111-1111-1111-1111-111111111111" };
    state.pathname = "/dashboard";
    const { queryByTestId } = render(
      <OnboardingGuard>{protectedChild}</OnboardingGuard>,
    );
    expect(queryByTestId("protected")).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });
});

describe("OnboardingGuard — self-loop prevention", () => {
  it("does not redirect when already on /onboarding (target_exam_id null)", () => {
    state.user = { target_exam_id: null };
    state.pathname = "/onboarding";
    const { queryByTestId } = render(
      <OnboardingGuard>{protectedChild}</OnboardingGuard>,
    );
    expect(state.replace).not.toHaveBeenCalled();
    expect(queryByTestId("protected")).toBeTruthy();
  });

  it("treats nested onboarding paths as exempt", () => {
    state.user = { target_exam_id: null };
    state.pathname = "/onboarding/exam";
    render(<OnboardingGuard>{protectedChild}</OnboardingGuard>);
    expect(state.replace).not.toHaveBeenCalled();
  });
});

describe("OnboardingGuard — loading & unauthenticated (defer to RoleGuard)", () => {
  it("does not redirect while auth is loading", () => {
    state.user = null;
    state.isLoading = true;
    state.pathname = "/dashboard";
    render(<OnboardingGuard>{protectedChild}</OnboardingGuard>);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("does not redirect a loading user even if a stale profile has a null exam", () => {
    state.user = { target_exam_id: null };
    state.isLoading = true;
    state.pathname = "/dashboard";
    render(<OnboardingGuard>{protectedChild}</OnboardingGuard>);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("does not perform an onboarding redirect for an unauthenticated user", () => {
    state.user = null;
    state.isLoading = false;
    state.pathname = "/dashboard";
    render(<OnboardingGuard>{protectedChild}</OnboardingGuard>);
    // RoleGuard owns the /login redirect; OnboardingGuard must stay silent.
    expect(state.replace).not.toHaveBeenCalled();
  });
});
