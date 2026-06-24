// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { CMSWorkspace } from "./CMSWorkspace";
import { listPages, listGuides } from "./cmsService";

vi.mock("./cmsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./cmsService")>();
  return {
    ...actual,
    listPages: vi.fn(),
    listGuides: vi.fn(),
    getPage: vi.fn(),
    getGuide: vi.fn(),
  };
});

beforeEach(() => {
  (listPages as Mock).mockResolvedValue([]);
  (listGuides as Mock).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CMSWorkspace", () => {
  it("renders only the data-backed sections as an accessible group", () => {
    render(<CMSWorkspace />);
    const group = screen.getByRole("group", { name: "CMS sections" });
    expect(group).toBeTruthy();
    for (const title of ["Pages", "Guides", "Published"]) {
      expect(screen.getByRole("button", { name: title })).toBeTruthy();
    }
  });

  it("omits non-functional tabs (Drafts / Scheduled) — no dead controls", () => {
    render(<CMSWorkspace />);
    expect(screen.queryByRole("button", { name: "Drafts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Scheduled" })).toBeNull();
  });

  it("loads and lists pages in the default section", async () => {
    (listPages as Mock).mockResolvedValue([
      { slug: "about-us", locale: "en", updated_at: "2026-06-01T10:00:00Z" },
    ]);
    render(<CMSWorkspace />);
    // Pages have no list title, so slug appears in both the Title and Slug cells.
    expect((await screen.findAllByText("about-us")).length).toBeGreaterThanOrEqual(1);
    expect(listPages).toHaveBeenCalled();
  });

  it("shows an empty state when nothing is published", async () => {
    render(<CMSWorkspace />);
    expect(await screen.findByText("No content found")).toBeTruthy();
  });

  it("shows an error state when the fetch fails", async () => {
    (listPages as Mock).mockRejectedValue(new Error("boom"));
    render(<CMSWorkspace />);
    expect(await screen.findByText("Could not load content")).toBeTruthy();
  });

  it("exposes the disabled status filter in data sections", () => {
    render(<CMSWorkspace />);
    expect((screen.getByLabelText("Status") as HTMLSelectElement).disabled).toBe(true);
  });
});
