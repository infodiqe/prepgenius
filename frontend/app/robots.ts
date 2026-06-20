import type { MetadataRoute } from "next";
import { DISALLOWED_PATHS, SITE_URL } from "@/lib/seo/config";

// Crawl guidance (T36 PART 3). Public routes are indexable; the authenticated
// app and API surface are disallowed. This is not an access boundary — auth is
// enforced by middleware + the backend.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
