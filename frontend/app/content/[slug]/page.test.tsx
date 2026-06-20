import { afterEach, describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  fetchCmsPage: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  get: vi.fn(() => ({ value: "as" })),
}));

vi.mock("@/lib/cms/api", () => ({ fetchCmsPage: spies.fetchCmsPage }));
vi.mock("next/navigation", () => ({ notFound: spies.notFound }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: spies.get }),
}));
// Keep the test focused on routing/data, not the chrome/renderer internals.
vi.mock("@/features/marketing/PublicHeader", () => ({ PublicHeader: () => null }));
vi.mock("@/features/marketing/PublicFooter", () => ({ PublicFooter: () => null }));
vi.mock("@/features/cms/BlockRenderer", () => ({ BlockRenderer: () => null }));

import ContentPage, { generateMetadata } from "./page";

afterEach(() => {
  spies.fetchCmsPage.mockReset();
  spies.notFound.mockClear();
});

describe("ContentPage", () => {
  it("calls notFound() when the page is missing or unpublished", async () => {
    spies.fetchCmsPage.mockResolvedValue(null);
    await expect(
      ContentPage({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(spies.notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the page when found", async () => {
    spies.fetchCmsPage.mockResolvedValue({
      slug: "about",
      title: "About",
      meta_title: "",
      meta_description: "",
      locale: "as",
      status: "published",
      published_at: null,
      blocks: [{ block_type: "hero", sort_order: 0, content: {} }],
    });
    const result = await ContentPage({
      params: Promise.resolve({ slug: "about" }),
    });
    expect(result).toBeTruthy();
    expect(spies.notFound).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("builds canonical metadata from the page", async () => {
    spies.fetchCmsPage.mockResolvedValue({
      slug: "about",
      title: "About",
      meta_title: "About Meta",
      meta_description: "desc",
      locale: "as",
      status: "published",
      published_at: null,
      blocks: [],
    });
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "about" }),
    });
    expect(meta.title).toBe("About Meta");
    expect((meta.alternates as { canonical?: string }).canonical).toBe(
      "/content/about",
    );
  });

  it("returns empty metadata when the page is missing", async () => {
    spies.fetchCmsPage.mockResolvedValue(null);
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(meta).toEqual({});
  });
});
