// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { UserDetailDrawer } from "./UserDetailDrawer";
import type { OpsUser, OpsUserSummary } from "./userService";

afterEach(() => cleanup());

function makeUser(over: Partial<OpsUser> = {}): OpsUser {
  return {
    id: "u-1",
    email: "amla@example.com",
    full_name: "Amla Bora",
    phone_e164: null,
    preferred_language: "as",
    target_exam_id: null,
    exam_date: null,
    is_minor: false,
    status: "active",
    is_email_verified: true,
    created_at: "2026-01-15T08:00:00Z",
    roles: ["support"],
    ...over,
  } as OpsUser;
}

const SUMMARY: OpsUserSummary = {
  total_attempts: 3,
  latest_attempt: null,
  readiness_score: "70.00",
  current_streak: 2,
};

function baseProps(
  over: Partial<React.ComponentProps<typeof UserDetailDrawer>> = {},
): React.ComponentProps<typeof UserDetailDrawer> {
  return {
    open: true,
    onOpenChange: vi.fn(),
    fallbackName: "Amla Bora",
    user: makeUser(),
    detailPhase: "ready",
    onRetryDetail: vi.fn(),
    examName: undefined,
    summary: SUMMARY,
    summaryPhase: "ready",
    ...over,
  };
}

describe("UserDetailDrawer (read-only)", () => {
  it("renders nothing when closed", () => {
    render(<UserDetailDrawer {...baseProps({ open: false })} />);
    expect(screen.queryByText("Read-only view")).toBeNull();
  });

  it("shows a loading state while the detail loads (header uses the fallback name)", () => {
    render(
      <UserDetailDrawer
        {...baseProps({ detailPhase: "loading", user: null })}
      />,
    );
    expect(
      screen.getByRole("status", { name: "Loading user details" }),
    ).toBeTruthy();
    expect(screen.getByText("Amla Bora")).toBeTruthy(); // fallback title
  });

  it("shows an error state with Retry that fires onRetryDetail", () => {
    const onRetryDetail = vi.fn();
    render(
      <UserDetailDrawer
        {...baseProps({ detailPhase: "error", user: null, onRetryDetail })}
      />,
    );
    expect(screen.getByText("Could not load user")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryDetail).toHaveBeenCalled();
  });

  it("has an accessible dialog name and a consistent close button", () => {
    render(<UserDetailDrawer {...baseProps()} />);
    expect(screen.getByLabelText("User details")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close details" })).toBeTruthy();
  });

  it("requests close via the close button", () => {
    const onOpenChange = vi.fn();
    render(<UserDetailDrawer {...baseProps({ onOpenChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders profile, account, roles and the learning snapshot", () => {
    render(<UserDetailDrawer {...baseProps()} />);
    expect(screen.getByText("amla@example.com")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("support")).toBeTruthy();
    expect(screen.getByText("as")).toBeTruthy();
    expect(screen.getByText("Learning snapshot")).toBeTruthy();
    expect(screen.getByText("Total attempts")).toBeTruthy();
  });

  it("omits rows for absent data (no Phone / Exam date when null)", () => {
    render(<UserDetailDrawer {...baseProps()} />);
    expect(screen.queryByText("Phone")).toBeNull();
    expect(screen.queryByText("Exam date")).toBeNull();
  });

  it("renders Phone, Target exam (from list name) and Exam date when present", () => {
    render(
      <UserDetailDrawer
        {...baseProps({
          user: makeUser({
            phone_e164: "+919999999999",
            target_exam_id: "exam-1",
            exam_date: "2026-09-01",
          }),
          examName: "CTET",
        })}
      />,
    );
    expect(screen.getByText("Phone")).toBeTruthy();
    expect(screen.getByText("+919999999999")).toBeTruthy();
    expect(screen.getByText("Target exam")).toBeTruthy();
    expect(screen.getByText("CTET")).toBeTruthy();
    expect(screen.getByText("Exam date")).toBeTruthy();
  });

  it("shows Credits and Subscription as awaiting backend support", () => {
    render(<UserDetailDrawer {...baseProps()} />);
    expect(screen.getByText(/Credit data is awaiting backend support/i)).toBeTruthy();
    expect(
      screen.getByText(/Subscription data is awaiting backend support/i),
    ).toBeTruthy();
  });

  it("exposes NO edit / save / mutation actions — only Close (read-only)", () => {
    render(<UserDetailDrawer {...baseProps()} />);
    for (const name of [
      /edit/i,
      /save/i,
      /delete/i,
      /suspend/i,
      /reset password/i,
      /grant/i,
      /impersonate/i,
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
