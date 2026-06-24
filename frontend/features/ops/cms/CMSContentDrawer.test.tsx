// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { CMSContentDrawer } from "./CMSContentDrawer";
import { getPage, type CmsContentItem } from "./cmsService";

vi.mock("./cmsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./cmsService")>();
  return { ...actual, getPage: vi.fn(), getGuide: vi.fn() };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ITEM: CmsContentItem = {
  type: "page",
  slug: "about-us",
  title: "about-us",
  locale: "en",
  status: "published",
  updatedAt: "2026-06-01T10:00:00Z",
};

const PAGE_DETAIL = {
  slug: "about-us",
  title: "About Us",
  meta_title: "About — PrepGenius",
  meta_description: "Who we are",
  locale: "en",
  status: "published",
  published_at: "2026-06-01T10:00:00Z",
  blocks: [
    { block_type: "rich_text", sort_order: 0, content: { body: "Hello world" } },
  ],
};

describe("CMSContentDrawer (read-only)", () => {
  it("renders nothing when closed", () => {
    render(<CMSContentDrawer open={false} onOpenChange={() => {}} item={ITEM} />);
    expect(screen.queryByText("Content details")).toBeNull();
  });

  it("fetches and shows metadata + preview when opened", async () => {
    (getPage as Mock).mockResolvedValue(PAGE_DETAIL);
    render(<CMSContentDrawer open onOpenChange={() => {}} item={ITEM} />);
    expect(await screen.findByText("About Us")).toBeTruthy();
    expect(screen.getByText("Who we are")).toBeTruthy();
    expect(screen.getByText("Hello world")).toBeTruthy();
    expect(getPage).toHaveBeenCalledWith("about-us", "en");
  });

  it("shows an error state with Retry when the fetch fails", async () => {
    (getPage as Mock).mockRejectedValue(new Error("boom"));
    render(<CMSContentDrawer open onOpenChange={() => {}} item={ITEM} />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("has an accessible dialog label and a working close button", async () => {
    (getPage as Mock).mockResolvedValue(PAGE_DETAIL);
    const onOpenChange = vi.fn();
    render(<CMSContentDrawer open onOpenChange={onOpenChange} item={ITEM} />);
    expect(screen.getByLabelText("CMS content details")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("exposes no edit/publish/archive actions", async () => {
    (getPage as Mock).mockResolvedValue(PAGE_DETAIL);
    render(<CMSContentDrawer open onOpenChange={() => {}} item={ITEM} />);
    await screen.findByText("About Us");
    for (const name of [/edit/i, /publish/i, /archive/i, /save/i]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });
});
