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
import { DiagnosticCard } from "./DiagnosticCard";

const spies = vi.hoisted(() => ({
  createAttempt: vi.fn(),
  startAttempt: vi.fn(),
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
vi.mock("@/features/attempts/attemptService", () => ({
  createAttempt: spies.createAttempt,
  startAttempt: spies.startAttempt,
}));
// Mock the toast store; useErrorToast (real) imports `toast` from this module.
vi.mock("@/features/feedback/useToast", () => ({
  toast: spies.toast,
}));

const EXAM_ID = "exam-123";
const MOCK_TEST_ID = "mt-789";

afterEach(() => cleanup());
beforeEach(() => {
  spies.createAttempt.mockReset();
  spies.startAttempt.mockReset().mockResolvedValue({ id: "att-1" });
  spies.push.mockReset();
  spies.toast.mockReset();
});

function renderCard() {
  return render(
    <DiagnosticCard examId={EXAM_ID} diagnosticMockTestId={MOCK_TEST_ID} />,
  );
}

function clickCta() {
  fireEvent.click(screen.getByRole("button", { name: "cta" }));
}

describe("DiagnosticCard — render", () => {
  it("renders the diagnostic CTA inside a labelled region", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "cta" })).toBeTruthy();
    expect(screen.getByText("title")).toBeTruthy();
    const region = screen.getByRole("region");
    const labelledby = region.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    expect(document.getElementById(labelledby!)?.textContent).toBe("title");
  });
});

describe("DiagnosticCard — launch flow", () => {
  it("creates a full_mock, starts it, navigates with flow=diagnostic, and toasts success", async () => {
    spies.createAttempt.mockResolvedValue({ id: "att-1" });
    renderCard();
    clickCta();

    await waitFor(() =>
      expect(spies.push).toHaveBeenCalledWith(
        "/practice/att-1?flow=diagnostic",
      ),
    );

    // SPR1-HOTFIX-02: full_mock bound to the configured diagnostic mock test.
    expect(spies.createAttempt).toHaveBeenCalledWith({
      exam_id: EXAM_ID,
      attempt_type: "full_mock",
      mock_test_id: MOCK_TEST_ID,
    });
    expect(spies.startAttempt).toHaveBeenCalledWith("att-1");
    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "launch_success",
    });

    // Order: create → start → navigate.
    const createOrder = spies.createAttempt.mock.invocationCallOrder[0];
    const startOrder = spies.startAttempt.mock.invocationCallOrder[0];
    const pushOrder = spies.push.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(startOrder);
    expect(startOrder).toBeLessThan(pushOrder);
  });

  it("shows a busy/loading state while launching", async () => {
    // Never resolves → stays in the launching state.
    spies.createAttempt.mockReturnValue(new Promise(() => {}));
    renderCard();
    clickCta();

    await waitFor(() => {
      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-busy")).toBe("true");
    });
    // SR live region announces launching.
    expect(screen.getByRole("status").textContent).toBe("launching");
  });

  it("does not launch a second attempt on a rapid double click", async () => {
    spies.createAttempt.mockReturnValue(new Promise(() => {}));
    renderCard();
    // Grab the node once (its label changes to "launching" after the 1st click).
    const button = screen.getByRole("button", { name: "cta" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() =>
      expect(spies.createAttempt).toHaveBeenCalledTimes(1),
    );
  });

  it("surfaces an error toast and stays on the page when create fails", async () => {
    spies.createAttempt.mockRejectedValue(new ApiError(400, {}));
    renderCard();
    clickCta();

    await waitFor(() => expect(spies.toast).toHaveBeenCalled());
    expect(spies.push).not.toHaveBeenCalled();
    // Re-enabled for retry.
    await waitFor(() =>
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
  });

  it("surfaces an error toast when start fails (after create)", async () => {
    spies.createAttempt.mockResolvedValue({ id: "att-1" });
    spies.startAttempt.mockRejectedValue(new ApiError(400, {}));
    renderCard();
    clickCta();

    await waitFor(() => expect(spies.toast).toHaveBeenCalled());
    expect(spies.push).not.toHaveBeenCalled();
  });
});
