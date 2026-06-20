// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/features/auth/authService";
import { ExamPreferencesForm } from "./ExamPreferencesForm";

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
  full_name: "Learner",
  phone_e164: null,
  preferred_language: "en",
  target_exam_id: "exam-1",
  exam_date: "2099-12-31",
  is_minor: false,
  status: "active",
  is_email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  roles: ["student"],
} as UserProfile;

const EXAMS = [
  { id: "exam-1", name: "CTET", code: "CTET", is_active: true },
  { id: "exam-2", name: "Assam TET", code: "ATET", is_active: true },
];

afterEach(() => cleanup());
beforeEach(() => {
  spies.updateProfile.mockReset().mockResolvedValue(USER);
  spies.refreshProfile.mockReset().mockResolvedValue(undefined);
  spies.refreshRoute.mockReset();
  spies.notifyError.mockReset();
  spies.toast.mockReset();
});

describe("ExamPreferencesForm", () => {
  it("shows the current exam and selected values", () => {
    render(<ExamPreferencesForm user={USER} exams={EXAMS} />);

    expect(screen.getAllByText("CTET (CTET)").length).toBeGreaterThan(0);
    expect(
      (screen.getByLabelText(/exam.select_exam/) as HTMLSelectElement).value,
    ).toBe("exam-1");
    expect((screen.getByLabelText("exam.date") as HTMLInputElement).value).toBe(
      "2099-12-31",
    );
    expect(
      (screen.getByRole("button", { name: "exam.save" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("changes target exam, permits clearing the optional date, and refreshes state", async () => {
    render(<ExamPreferencesForm user={USER} exams={EXAMS} />);

    fireEvent.change(screen.getByLabelText(/exam.select_exam/), {
      target: { value: "exam-2" },
    });
    fireEvent.change(screen.getByLabelText("exam.date"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "exam.save" }));

    await waitFor(() => expect(spies.refreshRoute).toHaveBeenCalledTimes(1));
    expect(spies.updateProfile).toHaveBeenCalledWith({
      target_exam_id: "exam-2",
      exam_date: null,
    });
    expect(spies.refreshProfile).toHaveBeenCalledTimes(1);
    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "exam.success",
    });
  });

  it("renders the shared empty state when no active exams are available", () => {
    render(<ExamPreferencesForm user={USER} exams={[]} />);

    expect(screen.getByText("exam.empty_title")).toBeTruthy();
    expect(screen.getByText("exam.empty_desc")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button", { name: "exam.save" })).toBeNull();
  });

  it("rejects a past exam date and keeps the error linked to the input", async () => {
    render(<ExamPreferencesForm user={USER} exams={EXAMS} />);

    fireEvent.change(screen.getByLabelText("exam.date"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "exam.save" }));

    expect((await screen.findByRole("alert")).textContent).toContain("exam.date_past");
    expect(spies.updateProfile).not.toHaveBeenCalled();
    expect(screen.getByLabelText("exam.date").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
});

