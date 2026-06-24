// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { AnalyticsStateNotice } from "./AnalyticsStateNotice";

afterEach(() => cleanup());

describe("AnalyticsStateNotice", () => {
  it("renders nothing in the ready state", () => {
    const { container } = render(<AnalyticsStateNotice phase="ready" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an accessible loading state", () => {
    render(<AnalyticsStateNotice phase="loading" loadingLabel="Loading X" />);
    expect(screen.getByRole("status", { name: "Loading X" })).toBeTruthy();
  });

  it("renders an error state with a working Retry", () => {
    const onRetry = vi.fn();
    render(<AnalyticsStateNotice phase="error" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Could not load analytics")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders unauthorized without a retry", () => {
    render(<AnalyticsStateNotice phase="unauthorized" onRetry={() => {}} />);
    expect(screen.getByText("Sign in required")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("renders forbidden without a retry", () => {
    render(<AnalyticsStateNotice phase="forbidden" onRetry={() => {}} />);
    expect(screen.getByText("Access denied")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});
