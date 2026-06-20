import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { DISALLOWED_PATHS, SITE_URL } from "@/lib/seo/config";

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("includes the public routes with absolute URLs", () => {
    expect(urls).toContain(`${SITE_URL}`);
    expect(urls).toContain(`${SITE_URL}/login`);
    expect(urls).toContain(`${SITE_URL}/register`);
  });

  it("does not leak authenticated routes", () => {
    for (const entry of entries) {
      for (const blocked of DISALLOWED_PATHS) {
        expect(entry.url.includes(blocked)).toBe(false);
      }
    }
  });

  it("gives every entry a priority and change frequency", () => {
    for (const entry of entries) {
      expect(typeof entry.priority).toBe("number");
      expect(entry.changeFrequency).toBe("weekly");
    }
    const home = entries.find((e) => e.url === SITE_URL);
    expect(home?.priority).toBe(1);
  });
});
