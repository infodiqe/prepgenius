// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useToast, toast, type ToastVariant } from "./useToast";

afterEach(() => {
  // Dismiss everything left in the module-level store between tests.
  const { result } = renderHook(() => useToast());
  act(() => {
    for (const t of [...result.current.toasts]) result.current.dismiss(t.id);
  });
});

describe("toast store", () => {
  it("adds a toast with the given variant, title and description", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ variant: "success", title: "Saved", description: "All good" });
    });
    const latest = result.current.toasts[0];
    expect(latest.variant).toBe("success");
    expect(latest.title).toBe("Saved");
    expect(latest.description).toBe("All good");
    expect(latest.open).toBe(true);
  });

  it("supports success, error, warning and info variants", () => {
    const { result } = renderHook(() => useToast());
    const variants: ToastVariant[] = ["success", "error", "warning", "info"];
    for (const variant of variants) {
      act(() => {
        toast({ variant, title: variant });
      });
      expect(result.current.toasts[0].variant).toBe(variant);
    }
  });

  it("defaults to the info variant when none is given", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: "Heads up" });
    });
    expect(result.current.toasts[0].variant).toBe("info");
  });

  it("returns an id and a dismiss() that closes the toast", () => {
    const { result } = renderHook(() => useToast());
    let handle: { id: string; dismiss: () => void } | undefined;
    act(() => {
      handle = toast({ title: "Dismiss me" });
    });
    expect(handle?.id).toBeTruthy();
    act(() => handle?.dismiss());
    const found = result.current.toasts.find((t) => t.id === handle!.id);
    // After dismiss it is marked closed (and scheduled for removal).
    expect(found?.open ?? false).toBe(false);
  });

  it("enforces the toast limit (3)", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: "1" });
      toast({ title: "2" });
      toast({ title: "3" });
      toast({ title: "4" });
    });
    expect(result.current.toasts.length).toBe(3);
  });
});
