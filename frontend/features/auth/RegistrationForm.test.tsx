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
import RegistrationForm from "./RegistrationForm";

const spies = vi.hoisted(() => ({
  register: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));

// Identity translator → assertions check the i18n key that was selected.
// `rich` renders the privacy/terms link chunks so consent links are assertable.
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = ((k: string) => k) as ((k: string) => string) & {
      rich: (
        k: string,
        tags: Record<string, (chunks: React.ReactNode) => React.ReactNode>,
      ) => React.ReactNode;
    };
    t.rich = (k, tags) => (
      <>
        {k} {tags.privacy?.("privacy")} {tags.terms?.("terms")}
      </>
    );
    return t;
  },
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: spies.push }),
}));
vi.mock("@/features/auth/authService", () => ({
  register: spies.register,
}));
// Mock the toast store; useErrorToast (real) imports `toast` from this module.
vi.mock("@/features/feedback/useToast", () => ({
  toast: spies.toast,
}));

afterEach(() => cleanup());
beforeEach(() => {
  spies.register.mockReset();
  spies.push.mockReset();
  spies.toast.mockReset();
});

/** Fill the form with a valid payload (phone left blank unless provided). */
function fillValid(overrides: Partial<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    name: "Student Name",
    email: "user@example.com",
    password: "password123",
    confirm_password: "password123",
    ...overrides,
  };
  fireEvent.change(screen.getByLabelText("name"), {
    target: { value: values.name },
  });
  fireEvent.change(screen.getByLabelText("email"), {
    target: { value: values.email },
  });
  fireEvent.change(screen.getByLabelText("password"), {
    target: { value: values.password },
  });
  fireEvent.change(screen.getByLabelText("confirm_password"), {
    target: { value: values.confirm_password },
  });
  if (overrides.phone !== undefined) {
    fireEvent.change(screen.getByLabelText(/phone/), {
      target: { value: overrides.phone },
    });
  }
  // Consent is required to submit (T06); leave it unchecked only when asked.
  if (overrides.consent !== "skip") {
    const consent = screen.getByRole("checkbox") as HTMLInputElement;
    if (!consent.checked) fireEvent.click(consent);
  }
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "register" }));
}

describe("RegistrationForm — render & accessibility", () => {
  it("renders all fields with associated labels", () => {
    render(<RegistrationForm />);
    expect(screen.getByLabelText("name")).toBeTruthy();
    expect(screen.getByLabelText("email")).toBeTruthy();
    expect(screen.getByLabelText(/phone/)).toBeTruthy();
    expect(screen.getByLabelText("password")).toBeTruthy();
    expect(screen.getByLabelText("confirm_password")).toBeTruthy();
    expect(screen.getByLabelText("preferred_language")).toBeTruthy();
  });

  it("wires aria-invalid + aria-describedby when a field is invalid", async () => {
    render(<RegistrationForm />);
    fillValid({ email: "not-an-email" });
    submit();

    await waitFor(() =>
      expect(screen.getByLabelText("email").getAttribute("aria-invalid")).toBe(
        "true",
      ),
    );
    const email = screen.getByLabelText("email");
    expect(email.getAttribute("aria-describedby")).toBe("email-error");
    const alert = document.getElementById("email-error");
    expect(alert?.getAttribute("role")).toBe("alert");
  });
});

describe("RegistrationForm — validation", () => {
  it("blocks submit and shows messages when empty", async () => {
    render(<RegistrationForm />);
    submit();

    await waitFor(() =>
      expect(screen.getByText("val_name_required")).toBeTruthy(),
    );
    expect(screen.getByText("val_email_required")).toBeTruthy();
    expect(screen.getByText("val_password_required")).toBeTruthy();
    expect(spies.register).not.toHaveBeenCalled();
  });

  it("rejects an invalid optional phone number", async () => {
    render(<RegistrationForm />);
    fillValid({ phone: "12345" });
    submit();

    await waitFor(() =>
      expect(screen.getByText("val_phone_invalid")).toBeTruthy(),
    );
    expect(spies.register).not.toHaveBeenCalled();
  });
});

describe("RegistrationForm — success handling", () => {
  it("posts the contract payload, toasts success, and routes to verify-email", async () => {
    spies.register.mockResolvedValue({ detail: "ok" });
    render(<RegistrationForm />);
    fillValid();
    submit();

    await waitFor(() => expect(spies.register).toHaveBeenCalledTimes(1));

    const payload = spies.register.mock.calls[0][0];
    expect(payload).toMatchObject({
      full_name: "Student Name",
      email: "user@example.com",
      password: "password123",
      password_confirm: "password123",
      preferred_language: "as",
    });
    // phone omitted when blank (optional contract field).
    expect(payload).not.toHaveProperty("phone_e164");

    expect(spies.toast).toHaveBeenCalledWith({
      variant: "success",
      title: "success_register",
    });
    expect(spies.push).toHaveBeenCalledWith(
      "/verify-email?email=user%40example.com",
    );
  });

  it("includes phone_e164 in the payload when provided", async () => {
    spies.register.mockResolvedValue({ detail: "ok" });
    render(<RegistrationForm />);
    fillValid({ phone: "+919812345678" });
    submit();

    await waitFor(() => expect(spies.register).toHaveBeenCalledTimes(1));
    expect(spies.register.mock.calls[0][0]).toMatchObject({
      phone_e164: "+919812345678",
    });
  });
});

describe("RegistrationForm — DPDP consent (T06)", () => {
  it("renders a required, accessible consent checkbox", () => {
    render(<RegistrationForm />);
    const consent = screen.getByRole("checkbox") as HTMLInputElement;
    expect(consent.id).toBe("consent");
    expect(consent.checked).toBe(false);
    expect(consent.getAttribute("aria-required")).toBe("true");
  });

  it("renders Privacy Policy and Terms links pointing at the policy pages", () => {
    render(<RegistrationForm />);
    const links = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(links).toContain("/privacy");
    expect(links).toContain("/terms");
  });

  it("blocks submit and surfaces an error when consent is unchecked", async () => {
    render(<RegistrationForm />);
    fillValid({ consent: "skip" });
    submit();

    await waitFor(() =>
      expect(screen.getByText("val_consent_required")).toBeTruthy(),
    );
    expect(spies.register).not.toHaveBeenCalled();

    // Error is wired to the checkbox for assistive tech.
    const consent = screen.getByRole("checkbox");
    expect(consent.getAttribute("aria-invalid")).toBe("true");
    expect(consent.getAttribute("aria-describedby")).toBe("consent-error");
    expect(document.getElementById("consent-error")?.getAttribute("role")).toBe(
      "alert",
    );
  });

  it("submits once consent is checked and never sends it in the payload", async () => {
    spies.register.mockResolvedValue({ detail: "ok" });
    render(<RegistrationForm />);
    fillValid();
    submit();

    await waitFor(() => expect(spies.register).toHaveBeenCalledTimes(1));
    expect(spies.register.mock.calls[0][0]).not.toHaveProperty("consent");
  });
});

describe("RegistrationForm — error handling (T02 integration)", () => {
  it("shows a toast and maps backend field errors inline", async () => {
    spies.register.mockRejectedValue(
      new ApiError(400, {
        email: ["A user with this email already exists."],
      }),
    );
    render(<RegistrationForm />);
    fillValid();
    submit();

    await waitFor(() => expect(spies.register).toHaveBeenCalledTimes(1));
    // Global toast fired (validation category → warning variant).
    await waitFor(() => expect(spies.toast).toHaveBeenCalled());
    // Backend field error surfaced on the email field.
    await waitFor(() =>
      expect(
        screen.getByText("A user with this email already exists."),
      ).toBeTruthy(),
    );
    expect(spies.push).not.toHaveBeenCalled();
  });
});
