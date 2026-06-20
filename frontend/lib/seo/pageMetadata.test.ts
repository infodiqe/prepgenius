import { describe, expect, it } from "vitest";
import { PUBLIC_PAGE_META, PUBLIC_ROUTES, pageMetadata } from "./config";

describe("pageMetadata", () => {
  const meta = pageMetadata({
    title: "About Us",
    description: "desc",
    path: "/about",
  });

  it("sets title, description and canonical", () => {
    expect(meta.title).toBe("About Us");
    expect(meta.description).toBe("desc");
    expect((meta.alternates as { canonical?: string }).canonical).toBe("/about");
  });

  it("derives OpenGraph and Twitter from the page", () => {
    expect((meta.openGraph as { url?: string }).url).toBe("/about");
    expect(meta.openGraph?.title).toBe("About Us");
    expect((meta.twitter as { card?: string }).card).toBe(
      "summary_large_image",
    );
  });
});

describe("PUBLIC_PAGE_META", () => {
  it("covers the four public pages with canonical paths in the sitemap", () => {
    for (const key of [
      "about",
      "contact",
      "privacy",
      "terms",
      "pricing",
      "waitlist",
    ] as const) {
      const m = PUBLIC_PAGE_META[key];
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(m.path).toBe(`/${key}`);
      expect(PUBLIC_ROUTES).toContain(m.path);
    }
  });
});
