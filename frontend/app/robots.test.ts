import { describe, expect, it } from "vitest";
import robots from "./robots";
import { DISALLOWED_PATHS, SITE_URL } from "@/lib/seo/config";

describe("robots", () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

  it("allows indexing of public routes", () => {
    expect(rules.allow).toBe("/");
    expect(rules.userAgent).toBe("*");
  });

  it("disallows every authenticated / API path", () => {
    const disallow = rules.disallow as string[];
    for (const path of DISALLOWED_PATHS) {
      expect(disallow).toContain(path);
    }
    expect(disallow).toContain("/api");
  });

  it("references an absolute sitemap URL", () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
