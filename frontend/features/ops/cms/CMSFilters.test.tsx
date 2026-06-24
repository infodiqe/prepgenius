// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { CMSFilters } from "./CMSFilters";

afterEach(() => cleanup());

function renderFilters(over: Partial<React.ComponentProps<typeof CMSFilters>> = {}) {
  const props = {
    contentType: "all" as const,
    onContentTypeChange: vi.fn(),
    contentTypeDisabled: false,
    ...over,
  };
  return { props, ...render(<CMSFilters {...props} />) };
}

describe("CMSFilters", () => {
  it("renders the content-type options", () => {
    renderFilters();
    const select = screen.getByLabelText("Content type") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      "All",
      "Pages",
      "Guides",
    ]);
  });

  it("changes content type (data-source selection)", () => {
    const { props } = renderFilters();
    fireEvent.change(screen.getByLabelText("Content type"), {
      target: { value: "guide" },
    });
    expect(props.onContentTypeChange).toHaveBeenCalledWith("guide");
  });

  it("locks the content type when the section fixes it", () => {
    renderFilters({ contentTypeDisabled: true, contentType: "page" });
    expect(
      (screen.getByLabelText("Content type") as HTMLSelectElement).disabled,
    ).toBe(true);
  });

  it("disables the status filter with an awaiting-backend note", () => {
    renderFilters();
    expect((screen.getByLabelText("Status") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/awaiting backend support/i)).toBeTruthy();
  });
});
