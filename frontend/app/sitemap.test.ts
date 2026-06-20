import { afterEach, describe, expect, it, vi } from "vitest";
import { DISALLOWED_PATHS, SITE_URL } from "@/lib/seo/config";

const cms = vi.hoisted(() => ({ fetchPublishedCmsPages: vi.fn() }));
vi.mock("@/lib/cms/api", () => ({
  fetchPublishedCmsPages: cms.fetchPublishedCmsPages,
}));

import sitemap from "./sitemap";

afterEach(() => cms.fetchPublishedCmsPages.mockReset());

describe("sitemap", () => {
  it("includes the public routes with absolute URLs", async () => {
    cms.fetchPublishedCmsPages.mockResolvedValue([]);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}`);
    expect(urls).toContain(`${SITE_URL}/login`);
    expect(urls).toContain(`${SITE_URL}/register`);
  });

  it("does not leak authenticated routes", async () => {
    cms.fetchPublishedCmsPages.mockResolvedValue([]);
    const entries = await sitemap();
    for (const entry of entries) {
      for (const blocked of DISALLOWED_PATHS) {
        expect(entry.url.includes(blocked)).toBe(false);
      }
    }
  });

  it("gives every entry a priority and change frequency", async () => {
    cms.fetchPublishedCmsPages.mockResolvedValue([]);
    const entries = await sitemap();
    for (const entry of entries) {
      expect(typeof entry.priority).toBe("number");
      expect(entry.changeFrequency).toBe("weekly");
    }
    expect(entries.find((e) => e.url === SITE_URL)?.priority).toBe(1);
  });

  it("appends published CMS pages, de-duplicated across locales", async () => {
    cms.fetchPublishedCmsPages.mockResolvedValue([
      { slug: "about", locale: "as", updated_at: "2026-01-01T00:00:00Z" },
      { slug: "about", locale: "en", updated_at: "2026-01-01T00:00:00Z" },
      { slug: "guide", locale: "as", updated_at: "2026-01-01T00:00:00Z" },
    ]);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/content/about`);
    expect(urls).toContain(`${SITE_URL}/content/guide`);
    expect(urls.filter((u) => u === `${SITE_URL}/content/about`).length).toBe(1);
  });
});
