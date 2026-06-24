import { apiRequest } from "@/lib/api/client";
import type {
  CmsBlock,
  CmsGuideCard,
  CmsGuideDetail,
  CmsPage,
  CmsPageListItem,
} from "@/lib/cms/api";

/*
 * CMS Studio — client data access (OPS-04).
 *
 * Consumes ONLY the existing public CMS endpoints; the backend is the source of
 * truth. This is a READ-ONLY foundation — no edit, publish, archive, schedule,
 * or workflow. No client-side workflow engine, no optimistic updates.
 *
 *   GET /cms/pages/                 → published pages (slug, locale, updated_at)
 *   GET /cms/pages/{slug}/?locale=  → full page (meta, status, blocks)
 *   GET /cms/guides/?locale=        → published guide cards (slug, title, …)
 *   GET /cms/guides/{slug}/?locale= → full guide (meta, blocks, related)
 *
 * KNOWN BACKEND LIMITATIONS (documented gaps, surfaced as "Awaiting backend
 * support"): the public API exposes PUBLISHED content only — there is no draft
 * listing, no status filter, and no scheduling concept. The page list also omits
 * the title (slug only) and the guide list omits updated_at.
 */

export type { CmsBlock, CmsPage, CmsGuideDetail };

/** Backend default locale (DEFAULT_LOCALE = "as"). The Ops UI chrome is English. */
export const CMS_DEFAULT_LOCALE = "as";

export type CmsContentType = "page" | "guide";

/** Normalised row for the content table (pages + guides share one shape). */
export interface CmsContentItem {
  type: CmsContentType;
  slug: string;
  /** Pages omit a title in the list payload — slug is the fallback. */
  title: string;
  locale: string;
  category?: string;
  /** The list endpoints return published content only. */
  status: string;
  updatedAt?: string | null;
}

// ── Reads ──────────────────────────────────────────────────────────────────

export function listPages() {
  return apiRequest<CmsPageListItem[]>(`/cms/pages/`);
}

export function listGuides(locale: string = CMS_DEFAULT_LOCALE) {
  return apiRequest<CmsGuideCard[]>(
    `/cms/guides/?locale=${encodeURIComponent(locale)}`,
  );
}

export function getPage(slug: string, locale: string = CMS_DEFAULT_LOCALE) {
  return apiRequest<CmsPage>(
    `/cms/pages/${encodeURIComponent(slug)}/?locale=${encodeURIComponent(locale)}`,
  );
}

export function getGuide(slug: string, locale: string = CMS_DEFAULT_LOCALE) {
  return apiRequest<CmsGuideDetail>(
    `/cms/guides/${encodeURIComponent(slug)}/?locale=${encodeURIComponent(locale)}`,
  );
}

// ── Shaping (pure, display-only) ─────────────────────────────────────────────

export function pageToItem(page: CmsPageListItem): CmsContentItem {
  return {
    type: "page",
    slug: page.slug,
    title: page.slug,
    locale: page.locale,
    status: "published",
    updatedAt: page.updated_at,
  };
}

export function guideToItem(
  guide: CmsGuideCard,
  locale: string = CMS_DEFAULT_LOCALE,
): CmsContentItem {
  return {
    type: "guide",
    slug: guide.slug,
    title: guide.title,
    locale,
    category: guide.category,
    status: "published",
    updatedAt: null,
  };
}

// ── Sections ────────────────────────────────────────────────────────────────

export type CmsSectionKey =
  | "pages"
  | "guides"
  | "drafts"
  | "published"
  | "scheduled";

export interface CmsSectionDef {
  key: CmsSectionKey;
  title: string;
  /** "data" sections list content; "awaiting" sections are not API-supported. */
  kind: "data" | "awaiting";
  note?: string;
}

export const CMS_SECTIONS: readonly CmsSectionDef[] = [
  { key: "pages", title: "Pages", kind: "data" },
  { key: "guides", title: "Guides", kind: "data" },
  {
    key: "drafts",
    title: "Drafts",
    kind: "awaiting",
    note: "Draft listing is awaiting backend support — the CMS API exposes published content only.",
  },
  { key: "published", title: "Published", kind: "data" },
  {
    key: "scheduled",
    title: "Scheduled",
    kind: "awaiting",
    note: "Scheduling is awaiting backend support — the CMS API has no scheduled state.",
  },
];
