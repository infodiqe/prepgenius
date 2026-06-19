// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { Toaster } from "./Toaster";
import { toast, useToast } from "./useToast";

// Radix Toast needs ResizeObserver, which jsdom does not provide.
beforeAll(() => {
  globalThis.ResizeObserver =
    globalThis.ResizeObserver ||
    (class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver);
});

// i18n passthrough so t("close") === "close".
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

afterEach(() => {
  // Flush the module-level toast store so toasts don't leak across tests.
  vi.useFakeTimers();
  const { result } = renderHook(() => useToast());
  act(() => {
    for (const t of [...result.current.toasts]) result.current.dismiss(t.id);
  });
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  cleanup();
});

describe("Toaster", () => {
  it("renders a toast title and description in a live region", () => {
    const { getByText, getByRole } = render(<Toaster />);
    act(() => {
      toast({
        variant: "success",
        title: "Profile saved",
        description: "Your changes were saved",
      });
    });
    expect(getByText("Profile saved")).toBeTruthy();
    expect(getByText("Your changes were saved")).toBeTruthy();
    // Radix Toast viewport exposes a region for assistive technology.
    expect(getByRole("region")).toBeTruthy();
  });

  it("renders a localized, accessible close control", () => {
    const { getByLabelText } = render(<Toaster />);
    act(() => {
      toast({ variant: "error", title: "Something failed" });
    });
    expect(getByLabelText("close")).toBeTruthy();
  });
});
