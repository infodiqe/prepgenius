// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { ApiError } from "@/lib/errors";
import OnboardingWizard from "./OnboardingWizard";

const spies = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  refreshProfile: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));

// Identity translator → assertions check the i18n key that was selected.
vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: spies.push }),
}));
vi.mock("@/features/auth/authService", () => ({
  updateProfile: spies.updateProfile,
}));
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ refreshProfile: spies.refreshProfile }),
}));
// Mock the toast store; useErrorToast (real) imports `toast` from this module.
vi.mock("@/features/feedback/useToast", () => ({
  toast: spies.toast,
}));

const EXAMS = [
  { id: "e1", name: "CTET", code: "CTET" },
  { id: "e2", name: "Assam TET", code: "ATET" },
];

const FUTURE_DATE = "2099-12-31";

afterEach(() => cleanup());
beforeEach(() => {
  spies.updateProfile.mockReset();
  spies.refreshProfile.mockReset().mockResolvedValue(undefined);
  spies.push.mockReset();
  spies.toast.mockReset();
});

function renderWizard() {
  return render(<OnboardingWizard exams={EXAMS} />);
}

/** Advance from step 1 → step 2 with a valid exam selected. */
async function pickExamAndAdvance() {
  fireEvent.change(screen.getByLabelText(/exam_label/), {
    target: { value: "e1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "next" }));
  await screen.findByLabelText(/date_label/);
}

/** Advance from step 2 → review with a valid future date. */
async function pickDateAndAdvance() {
  fireEvent.change(screen.getByLabelText(/date_label/), {
    target: { value: FUTURE_DATE },
  });
  fireEvent.click(screen.getByRole("button", { name: "next" }));
  await screen.findByRole("button", { name: "save" });
}

describe("OnboardingWizard — render", () => {
  it("renders step 1 with the exam selector and a sticky primary CTA", () => {
    const { container } = renderWizard();
    expect(screen.getByLabelText(/exam_label/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "next" })).toBeTruthy();
    // Sticky action bar present (mobile primary CTA stays reachable).
    expect(container.querySelector(".sticky")).toBeTruthy();
  });
});

describe("OnboardingWizard — validation", () => {
  it("blocks advancing and shows an error when no exam is selected", async () => {
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "next" }));

    await waitFor(() =>
      expect(screen.getByText("val_exam_required")).toBeTruthy(),
    );
    // Still on step 1 — date field not shown.
    expect(screen.queryByLabelText(/date_label/)).toBeNull();

    // Accessibility wiring on the invalid control.
    const select = screen.getByLabelText(/exam_label/);
    expect(select.getAttribute("aria-invalid")).toBe("true");
    // describedby links both the help text and the error message.
    expect(select.getAttribute("aria-describedby")).toContain(
      "target_exam_id-error",
    );
    expect(
      document.getElementById("target_exam_id-error")?.getAttribute("role"),
    ).toBe("alert");
  });

  it("requires an exam date", async () => {
    renderWizard();
    await pickExamAndAdvance();
    fireEvent.click(screen.getByRole("button", { name: "next" }));

    await waitFor(() =>
      expect(screen.getByText("val_date_required")).toBeTruthy(),
    );
  });

  it("rejects a past exam date", async () => {
    renderWizard();
    await pickExamAndAdvance();
    fireEvent.change(screen.getByLabelText(/date_label/), {
      target: { value: "2000-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "next" }));

    await waitFor(() =>
      expect(screen.getByText("val_date_past")).toBeTruthy(),
    );
  });
});

describe("OnboardingWizard — focus management", () => {
  it("moves focus to the new step heading on advance", async () => {
    renderWizard();
    await pickExamAndAdvance();
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe("step2_title"),
    );
  });
});

describe("OnboardingWizard — save", () => {
  it("PATCHes the profile, refreshes before navigating, and toasts success", async () => {
    spies.updateProfile.mockResolvedValue({ detail: "ok" });
    renderWizard();
    await pickExamAndAdvance();
    await pickDateAndAdvance();

    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(spies.push).toHaveBeenCalledWith("/dashboard"));

    // Correct contract payload (only the two supported fields).
    expect(spies.updateProfile).toHaveBeenCalledWith({
      target_exam_id: "e1",
      exam_date: FUTURE_DATE,
    });
    // Success toast (T01).
    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "success",
    });
    // T08 loop-prevention: refreshProfile is awaited BEFORE navigation.
    expect(spies.refreshProfile).toHaveBeenCalledTimes(1);
    const refreshOrder = spies.refreshProfile.mock.invocationCallOrder[0];
    const pushOrder = spies.push.mock.invocationCallOrder[0];
    const updateOrder = spies.updateProfile.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(refreshOrder);
    expect(refreshOrder).toBeLessThan(pushOrder);
  });

  it("shows an error toast and does not navigate when the PATCH fails", async () => {
    spies.updateProfile.mockRejectedValue(new ApiError(400, {}));
    renderWizard();
    await pickExamAndAdvance();
    await pickDateAndAdvance();

    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(spies.toast).toHaveBeenCalled());
    expect(spies.refreshProfile).not.toHaveBeenCalled();
    expect(spies.push).not.toHaveBeenCalled();
  });
});
