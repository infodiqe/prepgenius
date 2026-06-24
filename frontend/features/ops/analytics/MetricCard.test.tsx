// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MetricCard } from "./MetricCard";

afterEach(() => cleanup());

describe("MetricCard", () => {
  it("renders label, value and optional hint", () => {
    render(<MetricCard label="Total users" value={42} hint="all time" />);
    expect(screen.getByText("Total users")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("all time")).toBeTruthy();
  });

  it("applies a monospace class for money values", () => {
    render(<MetricCard label="Credits" value="100.00" mono />);
    const value = screen.getByText("100.00");
    expect(value.className).toContain("font-mono");
  });
});
