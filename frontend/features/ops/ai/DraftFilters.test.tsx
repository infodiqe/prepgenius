// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { DraftFilters } from "./DraftFilters";

afterEach(() => cleanup());

function baseProps(over: Partial<React.ComponentProps<typeof DraftFilters>> = {}) {
  return {
    search: "",
    onSearchChange: vi.fn(),
    onSearchSubmit: vi.fn(),
    status: "",
    exam: "",
    difficulty: "",
    language: "",
    provider: "",
    onStatusChange: vi.fn(),
    onExamChange: vi.fn(),
    onDifficultyChange: vi.fn(),
    onLanguageChange: vi.fn(),
    onProviderChange: vi.fn(),
    examOptions: ["CTET", "SSC"],
    ...over,
  };
}

describe("DraftFilters", () => {
  it("submits search", () => {
    const onSearchSubmit = vi.fn();
    render(<DraftFilters {...baseProps({ onSearchSubmit })} />);
    fireEvent.click(screen.getByRole("button", { name: "Search drafts" }));
    expect(onSearchSubmit).toHaveBeenCalled();
  });

  it("changing status filter fires callback", () => {
    const onStatusChange = vi.fn();
    render(<DraftFilters {...baseProps({ onStatusChange })} />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "generated" } });
    expect(onStatusChange).toHaveBeenCalledWith("generated");
  });

  it("renders exam options from props", () => {
    render(<DraftFilters {...baseProps()} />);
    expect(screen.getByRole("option", { name: "CTET" })).toBeTruthy();
  });
});
