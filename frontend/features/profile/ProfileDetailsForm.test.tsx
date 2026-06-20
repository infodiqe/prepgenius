// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/features/auth/authService";
import { ProfileDetailsForm } from "./ProfileDetailsForm";

const spies = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  refreshProfile: vi.fn(),
  refreshRoute: vi.fn(),
  notifyError: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: spies.refreshRoute }),
}));
vi.mock("@/features/auth/authService", () => ({
  updateProfile: spies.updateProfile,
}));
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ refreshProfile: spies.refreshProfile }),
}));
vi.mock("@/features/feedback/useErrorToast", () => ({
  useErrorToast: () => spies.notifyError,
}));
vi.mock("@/features/feedback/useToast", () => ({
  toast: spies.toast,
}));

const USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "learner@example.com",
  full_name: "Original Name",
  phone_e164: "+919800000000",
  preferred_language: "en",
  target_exam_id: "exam-1",
  exam_date: "2099-12-31",
  is_minor: false,
  status: "active",
  is_email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  roles: ["student"],
} as UserProfile;

afterEach(() => cleanup());
beforeEach(() => {
  spies.updateProfile.mockReset().mockResolvedValue(USER);
  spies.refreshProfile.mockReset().mockResolvedValue(undefined);
  spies.refreshRoute.mockReset();
  spies.notifyError.mockReset();
  spies.toast.mockReset();
  document.cookie = "locale=; Max-Age=0; path=/";
});

describe("ProfileDetailsForm", () => {
  it("renders the current profile and keeps email read-only", () => {
    render(<ProfileDetailsForm user={USER} />);

    expect((screen.getByLabelText(/profile.full_name/) as HTMLInputElement).value).toBe(
      "Original Name",
    );
    const email = screen.getByLabelText("profile.email") as HTMLInputElement;
    expect(email.value).toBe("learner@example.com");
    expect(email.readOnly).toBe(true);
    expect(
      (screen.getByRole("button", { name: "profile.save" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("updates supported fields, refreshes auth state, and applies the locale", async () => {
    render(<ProfileDetailsForm user={USER} />);

    fireEvent.change(screen.getByLabelText(/profile.full_name/), {
      target: { value: "Updated Name" },
    });
    fireEvent.change(screen.getByLabelText("profile.phone"), {
      target: { value: "+919811111111" },
    });
    fireEvent.change(screen.getByLabelText("profile.language"), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "profile.save" }));

    await waitFor(() => expect(spies.refreshRoute).toHaveBeenCalledTimes(1));
    expect(spies.updateProfile).toHaveBeenCalledWith({
      full_name: "Updated Name",
      phone_e164: "+919811111111",
      preferred_language: "hi",
    });
    expect(spies.refreshProfile).toHaveBeenCalledTimes(1);
    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "profile.success",
    });
    expect(document.cookie).toContain("locale=hi");

    const updateOrder = spies.updateProfile.mock.invocationCallOrder[0];
    const profileOrder = spies.refreshProfile.mock.invocationCallOrder[0];
    const routeOrder = spies.refreshRoute.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(profileOrder);
    expect(profileOrder).toBeLessThan(routeOrder);
  });

  it("shows inline validation and does not submit an invalid phone", async () => {
    render(<ProfileDetailsForm user={USER} />);

    fireEvent.change(screen.getByLabelText("profile.phone"), {
      target: { value: "9800000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "profile.save" }));

    expect((await screen.findByRole("alert")).textContent).toContain("profile.phone_invalid");
    expect(spies.updateProfile).not.toHaveBeenCalled();
    expect(screen.getByLabelText("profile.phone").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
});

