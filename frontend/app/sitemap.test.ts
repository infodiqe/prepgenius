import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISALLOWED_PATHS, SITE_URL } from "@/lib/seo/config";

const cms = vi.hoisted(() => ({
  fetchPublishedCmsPages: vi.fn(),
  fetchGuides: vi.fn(),
}));
const exams = vi.hoisted(() => ({ fetchPublicExams: vi.fn() }));
vi.mock("@/lib/cms/api", () => ({
  fetchPublishedCmsPages: cms.fetchPublishedCmsPages,
  fetchGuides: cms.fetchGuides,
}));
vi.mock("@/lib/exams/api", () => ({
  fetchPublicExams: exams.fetchPublicExams,
}));

import sitemap from "./sitemap";

afterEach(() => {
  cms.fetchPublishedCmsPages.mockReset();
  cms.fetchGuides.mockReset();
  exams.fetchPublicExams.mockReset();
});

describe("sitemap", () => {
  beforeEach(() => {
    cms.fetchPublishedCmsPages.mockResolvedValue([]);
    cms.fetchGuides.mockResolvedValue([]);
    exams.fetchPublicExams.mockResolvedValue([]);
  });

  it("includes the public routes with absolute URLs", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}`);
    expect(urls).toContain(`${SITE_URL}/login`);
    expect(urls).toContain(`${SITE_URL}/register`);
    expect(urls).toContain(`${SITE_URL}/guides`);
  });

  it("does not leak authenticated routes", async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      for (const blocked of DISALLOWED_PATHS) {
        expect(entry.url.includes(blocked)).toBe(false);
      }
    }
  });

  it("gives every entry a priority and change frequency", async () => {
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

  it("appends published study guides, de-duplicated", async () => {
    cms.fetchGuides.mockResolvedValue([
      { slug: "how-to-ctet", title: "How to", meta_description: "", category: "CTET" },
      { slug: "ctet-eligibility", title: "Eligibility", meta_description: "", category: "CTET" },
    ]);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/guides/how-to-ctet`);
    expect(urls).toContain(`${SITE_URL}/guides/ctet-eligibility`);
  });

  it("appends published exam landing and syllabus pages", async () => {
    exams.fetchPublicExams.mockResolvedValue([
      { slug: "ctet", code: "C", name: "CTET", updated_at: "x" },
      { slug: "assam-tet", code: "A", name: "Assam TET", updated_at: "x" },
    ]);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/exams/ctet`);
    expect(urls).toContain(`${SITE_URL}/exams/ctet/syllabus`);
    expect(urls).toContain(`${SITE_URL}/exams/ctet/previous-year-papers`);
    expect(urls).toContain(`${SITE_URL}/exams/assam-tet`);
    expect(urls).toContain(`${SITE_URL}/exams/assam-tet/syllabus`);
    expect(urls).toContain(
      `${SITE_URL}/exams/assam-tet/previous-year-papers`,
    );
  });
});
