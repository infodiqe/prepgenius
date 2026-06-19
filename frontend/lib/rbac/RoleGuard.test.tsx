// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { RoleGuard } from "./RoleGuard";
import { ROLES } from "./types";

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

const protectedChild = <div data-testid="protected">secret</div>;

afterEach(() => {
  cleanup();
  state.user = null;
  state.isLoading = false;
  state.replace.mockClear();
});

describe("RoleGuard — student workspace (universal)", () => {
  it("allows any authenticated user, regardless of roles", () => {
    state.user = { roles: [ROLES.CONTENT_REVIEWER] };
    const { queryByTestId } = render(
      <RoleGuard requiredWorkspace="student">{protectedChild}</RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("allows a user with no extra roles", () => {
    state.user = { roles: [] };
    const { queryByTestId } = render(
      <RoleGuard requiredWorkspace="student">{protectedChild}</RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeTruthy();
  });
});

describe("RoleGuard — review workspace", () => {
  it("allows a reviewer", () => {
    state.user = { roles: [ROLES.CONTENT_REVIEWER] };
    const { queryByTestId } = render(
      <RoleGuard requiredWorkspace="review">{protectedChild}</RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("denies a plain student and redirects to /dashboard", () => {
    state.user = { roles: [ROLES.STUDENT] };
    const { queryByTestId } = render(
      <RoleGuard requiredWorkspace="review">{protectedChild}</RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(state.replace).toHaveBeenCalledWith("/dashboard");
  });
});

describe("RoleGuard — admin workspace", () => {
  it("allows a platform admin", () => {
    state.user = { roles: [ROLES.PLATFORM_ADMIN] };
    const { queryByTestId } = render(
      <RoleGuard requiredWorkspace="admin">{protectedChild}</RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeTruthy();
  });

  it("denies a reviewer (no admin access) and redirects to /dashboard", () => {
    state.user = { roles: [ROLES.CONTENT_REVIEWER] };
    const { queryByTestId } = render(
      <RoleGuard requiredWorkspace="admin">{protectedChild}</RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(state.replace).toHaveBeenCalledWith("/dashboard");
  });
});

describe("RoleGuard — unauthenticated & loading", () => {
  it("redirects an unauthenticated user to /login and hides children", () => {
    state.user = null;
    state.isLoading = false;
    const { queryByTestId } = render(
      <RoleGuard requiredWorkspace="review">{protectedChild}</RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(state.replace).toHaveBeenCalledWith("/login");
  });

  it("renders the fallback and does not redirect while auth is loading", () => {
    state.user = null;
    state.isLoading = true;
    const { queryByTestId } = render(
      <RoleGuard
        requiredWorkspace="review"
        fallback={<div data-testid="loading" />}
      >
        {protectedChild}
      </RoleGuard>,
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(queryByTestId("loading")).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
  });
});
