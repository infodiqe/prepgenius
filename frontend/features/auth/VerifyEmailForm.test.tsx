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
import VerifyEmailForm from "./VerifyEmailForm";

const spies = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  email: "user@example.com" as string | null,
}));

// Identity translator → assertions check the i18n key that was selected.
vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: spies.push }),
  useSearchParams: () => ({
    get: (k: string) => (k === "email" ? spies.email : null),
  }),
}));
vi.mock("@/features/auth/authService", () => ({
  verifyEmail: spies.verifyEmail,
  resendVerification: spies.resendVerification,
}));
// Mock the toast store; useErrorToast (real) imports `toast` from this module.
vi.mock("@/features/feedback/useToast", () => ({
  toast: spies.toast,
}));

afterEach(() => cleanup());
beforeEach(() => {
  spies.verifyEmail.mockReset();
  spies.resendVerification.mockReset();
  spies.push.mockReset();
  spies.toast.mockReset();
  spies.email = "user@example.com";
});

function typeToken(value: string) {
  fireEvent.change(screen.getByLabelText("verify_token"), {
    target: { value },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "submit" }));
}

describe("VerifyEmailForm — render & accessibility", () => {
  it("renders the token field and hides email when present in the query", () => {
    render(<VerifyEmailForm />);
    expect(screen.getByLabelText("verify_token")).toBeTruthy();
    expect(screen.queryByLabelText("email")).toBeNull();
  });

  it("shows the email field when no email is supplied in the query", () => {
    spies.email = null;
    render(<VerifyEmailForm />);
    expect(screen.getByLabelText("email")).toBeTruthy();
  });

  it("wires aria-invalid + aria-describedby when the token is invalid", async () => {
    render(<VerifyEmailForm />);
    submit();

    await waitFor(() =>
      expect(
        screen.getByLabelText("verify_token").getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    const token = screen.getByLabelText("verify_token");
    expect(token.getAttribute("aria-describedby")).toBe("token-error");
    expect(document.getElementById("token-error")?.getAttribute("role")).toBe(
      "alert",
    );
  });
});

describe("VerifyEmailForm — verification", () => {
  it("blocks submit and shows a message when the token is empty", async () => {
    render(<VerifyEmailForm />);
    submit();

    await waitFor(() =>
      expect(screen.getByText("val_token_required")).toBeTruthy(),
    );
    expect(spies.verifyEmail).not.toHaveBeenCalled();
  });

  it("verifies, toasts success, and routes to login on success", async () => {
    spies.verifyEmail.mockResolvedValue({ detail: "ok" });
    render(<VerifyEmailForm />);
    typeToken("  valid-token  ");
    submit();

    await waitFor(() => expect(spies.verifyEmail).toHaveBeenCalledTimes(1));
    // Token is trimmed; only the contract field is sent.
    expect(spies.verifyEmail.mock.calls[0][0]).toEqual({ token: "valid-token" });
    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "success_verify",
    });
    expect(spies.push).toHaveBeenCalledWith("/login");
  });

  it("shows an error toast and does not route on failed verification", async () => {
    spies.verifyEmail.mockRejectedValue(
      new ApiError(400, { token: ["Invalid or expired token."] }),
    );
    render(<VerifyEmailForm />);
    typeToken("bad-token");
    submit();

    await waitFor(() => expect(spies.verifyEmail).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(spies.toast).toHaveBeenCalled());
    // Backend token error surfaced inline.
    await waitFor(() =>
      expect(screen.getByText("Invalid or expired token.")).toBeTruthy(),
    );
    expect(spies.push).not.toHaveBeenCalled();
  });
});

describe("VerifyEmailForm — resend flow", () => {
  function clickResend() {
    fireEvent.click(screen.getByRole("button", { name: "resend_verification" }));
  }

  it("resends using the query email and toasts success", async () => {
    spies.resendVerification.mockResolvedValue({ detail: "ok" });
    render(<VerifyEmailForm />);
    clickResend();

    await waitFor(() =>
      expect(spies.resendVerification).toHaveBeenCalledTimes(1),
    );
    expect(spies.resendVerification.mock.calls[0][0]).toEqual({
      email: "user@example.com",
    });
    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "success_resend",
    });
  });

  it("blocks resend and prompts for an email when none is available", async () => {
    spies.email = null;
    render(<VerifyEmailForm />);
    clickResend();

    await waitFor(() =>
      expect(screen.getByText("val_email_required")).toBeTruthy(),
    );
    expect(spies.resendVerification).not.toHaveBeenCalled();
  });

  it("shows an error toast when resend fails (T02 integration)", async () => {
    spies.resendVerification.mockRejectedValue(new ApiError(500, {}));
    render(<VerifyEmailForm />);
    clickResend();

    await waitFor(() =>
      expect(spies.resendVerification).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(spies.toast).toHaveBeenCalled());
  });
});
