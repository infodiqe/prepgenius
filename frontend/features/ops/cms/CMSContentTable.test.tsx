// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { CMSContentTable } from "./CMSContentTable";
import type { CmsContentItem } from "./cmsService";

afterEach(() => cleanup());

const PAGE: CmsContentItem = {
  type: "page",
  slug: "about-us",
  title: "about-us",
  locale: "en",
  status: "published",
  updatedAt: "2026-06-01T10:00:00Z",
};
const GUIDE: CmsContentItem = {
  type: "guide",
  slug: "ctet-prep",
  title: "CTET Preparation",
  locale: "as",
  category: "Strategy",
  status: "published",
  updatedAt: null,
};

function baseProps(over: Partial<React.ComponentProps<typeof CMSContentTable>> = {}) {
  return {
    phase: "ready" as const,
    items: [PAGE, GUIDE],
    onOpen: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
}

describe("CMSContentTable", () => {
  it("renders a loading state", () => {
    render(<CMSContentTable {...baseProps({ phase: "loading", items: [] })} />);
    expect(screen.getByRole("status", { name: "Loading content" })).toBeTruthy();
  });

  it("renders an error state with a working Retry", () => {
    const props = baseProps({ phase: "error", items: [] });
    render(<CMSContentTable {...props} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("renders an empty state", () => {
    render(<CMSContentTable {...baseProps({ items: [] })} />);
    expect(screen.getByText("No content found")).toBeTruthy();
  });

  it("renders rows with accessible column headers", () => {
    render(<CMSContentTable {...baseProps()} />);
    expect(screen.getByRole("table")).toBeTruthy();
    for (const col of ["Title", "Slug", "Type", "Status", "Locale", "Category", "Updated"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeTruthy();
    }
    expect(screen.getByText("CTET Preparation")).toBeTruthy();
    // Pages have no list title, so slug appears as both Title and Slug cells.
    expect(screen.getAllByText("about-us").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Strategy")).toBeTruthy();
    expect(screen.getAllByText("Published").length).toBeGreaterThanOrEqual(2);
  });

  it("opens a row via the View action", () => {
    const props = baseProps();
    render(<CMSContentTable {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Open page about-us" }));
    expect(props.onOpen).toHaveBeenCalledWith(PAGE);
  });
});
