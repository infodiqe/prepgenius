// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { BillingEmptyState } from "./BillingEmptyState";

afterEach(() => cleanup());

describe("BillingEmptyState", () => {
  it("renders the default prompt", () => {
    render(<BillingEmptyState />);
    expect(screen.getByText("Select a user")).toBeTruthy();
    expect(
      screen.getByText(/Search for a user above/i),
    ).toBeTruthy();
  });

  it("renders custom title and message", () => {
    render(<BillingEmptyState title="Nothing here" message="Try again later." />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
    expect(screen.getByText("Try again later.")).toBeTruthy();
  });
});
