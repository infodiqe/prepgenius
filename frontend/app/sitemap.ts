import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo/config";

// Sitemap of public routes only (T36 PART 4). Authenticated routes are
// intentionally excluded and are also disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route === "/" ? "" : route}`,
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
