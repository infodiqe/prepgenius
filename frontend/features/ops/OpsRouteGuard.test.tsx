// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { OpsRouteGuard } from "./OpsRouteGuard";
import { ROLES } from "@/lib/rbac/types";

const state = vi.hoisted(() => ({
  user: null as { roles: string[] } | null,
  isLoading: false,
  replace: vi.fn(),
}));

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: state.user, isLoading: state.isLoading }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
}));

const protectedChild = <div data-testid="protected">ops</div>;

afterEach(() => {
  cleanup();
  state.user = null;
  state.isLoading = false;
  state.replace.mockClear();
});

describe("OpsRouteGuard — authorized access", () => {
  it("allows a platform admin (super admin persona)", () => {
    state.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { queryByTestId } = render(
      <OpsRouteGuard>{protectedChild}</OpsRouteGuard>,
    );
    expect(queryByTestId("protected")).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("allows an ops persona role (e.g. SME)", () => {
    state.user = { roles: [ROLES.SME] };
    const { queryByTestId } = render(
      <OpsRouteGuard>{protectedChild}</OpsRouteGuard>,
    );
    expect(queryByTestId("protected")).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });
});

describe("OpsRouteGuard — unauthorized redirect", () => {
  it("redirects an authenticated non-ops user to /dashboard and hides chrome", () => {
    state.user = { roles: [ROLES.STUDENT] };
    const { queryByTestId } = render(
      <OpsRouteGuard>{protectedChild}</OpsRouteGuard>,
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(state.replace).toHaveBeenCalledWith("/dashboard");
  });
});

describe("OpsRouteGuard — anonymous redirect", () => {
  it("redirects an unauthenticated user to /login and hides chrome", () => {
    state.user = null;
    state.isLoading = false;
    const { queryByTestId } = render(
      <OpsRouteGuard>{protectedChild}</OpsRouteGuard>,
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(state.replace).toHaveBeenCalledWith("/login");
  });

  it("renders the fallback and does not redirect while auth is loading", () => {
    state.user = null;
    state.isLoading = true;
    const { queryByTestId } = render(
      <OpsRouteGuard fallback={<div data-testid="loading" />}>
        {protectedChild}
      </OpsRouteGuard>,
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(queryByTestId("loading")).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });
});
