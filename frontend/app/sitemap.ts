import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo/config";
import { fetchPublishedCmsPages, fetchGuides } from "@/lib/cms/api";
import { fetchPublicExams } from "@/lib/exams/api";
import { defaultLocale } from "@/lib/i18n/locale";

// Sitemap of public routes (T36 PART 4) plus published CMS pages (T41), public
// exam landing pages (T42), and study guides (T45). Authenticated routes are
// excluded and disallowed in robots.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route === "/" ? "" : route}`,
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));

  // Published CMS pages. The route /content/<slug> is locale-agnostic, so we
  // de-duplicate slugs across locales. Failures degrade to static routes only.
  const cmsPages = await fetchPublishedCmsPages();
  const cmsSlugs = [...new Set(cmsPages.map((page) => page.slug))];
  const cmsEntries: MetadataRoute.Sitemap = cmsSlugs.map((slug) => ({
    url: `${SITE_URL}/content/${slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Published study guides (T45). The route /guides/<slug> is locale-agnostic;
  // guides are fetched in the default content locale. Failures degrade silently.
  const guides = await fetchGuides(defaultLocale);
  const guideSlugs = [...new Set(guides.map((guide) => guide.slug))];
  const guideEntries: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: `${SITE_URL}/guides/${slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Published exam landing + syllabus pages. Each exam slug is unique.
  const exams = await fetchPublicExams();
  const examEntries: MetadataRoute.Sitemap = exams.flatMap((exam) => [
    {
      url: `${SITE_URL}/exams/${exam.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/exams/${exam.slug}/syllabus`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/exams/${exam.slug}/previous-year-papers`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ]);

  return [...staticEntries, ...cmsEntries, ...guideEntries, ...examEntries];
}
