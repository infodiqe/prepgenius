// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ApiError } from "@/lib/errors";
import { errorToastInput, useErrorToast } from "./useErrorToast";
import { useToast } from "./useToast";

// i18n passthrough so the title equals the message key.
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

afterEach(() => {
  const { result } = renderHook(() => useToast());
  act(() => {
    for (const t of [...result.current.toasts]) result.current.dismiss(t.id);
  });
});

describe("errorToastInput (pure classification + localization)", () => {
  const t = (k: string) => k;

  it("validation → warning variant + localized key", () => {
    const out = errorToastInput(new ApiError(400, {}), t);
    expect(out.variant).toBe("warning");
    expect(out.title).toBe("validation");
    expect(out.error.category).toBe("validation");
  });

  it("rate limit and lockout → warning", () => {
    expect(errorToastInput(new ApiError(429, {}), t).variant).toBe("warning");
    expect(errorToastInput(new ApiError(423, {}), t).variant).toBe("warning");
  });

  it("server / authorization / network → error variant", () => {
    expect(errorToastInput(new ApiError(500, {}), t).variant).toBe("error");
    expect(errorToastInput(new ApiError(403, {}), t).variant).toBe("error");
    expect(errorToastInput(new TypeError("Failed to fetch"), t).title).toBe(
      "network",
    );
  });
});

describe("useErrorToast (integration with the T01 toast system)", () => {
  it("classifies, localizes and pushes a toast; returns the AppError", () => {
    const toastHook = renderHook(() => useToast());
    const errHook = renderHook(() => useErrorToast());

    let returned;
    act(() => {
      returned = errHook.result.current(new ApiError(403, { detail: "nope" }));
    });

    const latest = toastHook.result.current.toasts[0];
    expect(latest.title).toBe("authorization");
    expect(latest.variant).toBe("error");
    expect(returned!.category).toBe("authorization");
  });

  it("shows a warning toast for a rate-limit error", () => {
    const toastHook = renderHook(() => useToast());
    const errHook = renderHook(() => useErrorToast());

    act(() => {
      errHook.result.current(new ApiError(429, {}));
    });

    expect(toastHook.result.current.toasts[0].variant).toBe("warning");
    expect(toastHook.result.current.toasts[0].title).toBe("rateLimit");
  });
});
