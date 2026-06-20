import { describe, expect, it } from "vitest";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  homeMetadata,
  siteMetadata,
} from "./config";

describe("seo config", () => {
  it("exposes the required brand constants", () => {
    expect(SITE_NAME).toBe("PrepGenius");
    expect(SITE_DESCRIPTION).toContain("CTET");
    expect(SITE_DESCRIPTION).toContain("Assam TET");
  });

  it("declares the required keywords", () => {
    for (const keyword of [
      "CTET",
      "Assam TET",
      "Teacher Eligibility Test",
      "Mock Tests",
      "Exam Preparation",
      "AI Tutor",
    ]) {
      expect(SITE_KEYWORDS).toContain(keyword);
    }
  });

  it("normalises SITE_URL without a trailing slash", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });
});

describe("siteMetadata (root)", () => {
  it("sets a canonical metadataBase", () => {
    expect(siteMetadata.metadataBase?.toString()).toContain(SITE_URL);
  });

  it("uses a title template defaulting to the brand", () => {
    const title = siteMetadata.title as { default: string; template: string };
    expect(title.default).toBe(SITE_NAME);
    expect(title.template).toContain(SITE_NAME);
  });

  it("configures OpenGraph and Twitter", () => {
    expect(siteMetadata.openGraph?.title).toBe(SITE_NAME);
    expect((siteMetadata.twitter as { card?: string }).card).toBe(
      "summary_large_image",
    );
  });

  it("allows indexing at the root", () => {
    expect((siteMetadata.robots as { index?: boolean }).index).toBe(true);
  });
});

describe("homeMetadata (landing page)", () => {
  it("sets an absolute title, description, og and twitter", () => {
    expect((homeMetadata.title as { absolute: string }).absolute).toBe(
      SITE_NAME,
    );
    expect(homeMetadata.description).toBe(SITE_DESCRIPTION);
    expect(homeMetadata.openGraph?.title).toBe(SITE_NAME);
    expect((homeMetadata.twitter as { title?: string }).title).toBe(SITE_NAME);
  });

  it("declares a canonical homepage URL", () => {
    expect((homeMetadata.alternates as { canonical?: string }).canonical).toBe(
      "/",
    );
  });
});
