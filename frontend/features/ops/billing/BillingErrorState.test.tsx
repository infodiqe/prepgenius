// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { BillingErrorState } from "./BillingErrorState";

afterEach(() => cleanup());

describe("BillingErrorState", () => {
  it("renders an error with a working Retry", () => {
    const onRetry = vi.fn();
    render(<BillingErrorState variant="error" onRetry={onRetry} />);
    expect(screen.getByText("Could not load credits")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders forbidden without a retry", () => {
    render(<BillingErrorState variant="forbidden" onRetry={vi.fn()} />);
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("renders unauthorized", () => {
    render(<BillingErrorState variant="unauthorized" />);
    expect(screen.getByText("Sign in required")).toBeTruthy();
  });
});
