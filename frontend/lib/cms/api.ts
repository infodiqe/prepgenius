// Server-side CMS fetch helpers (T41). Talks to the read-only public CMS API.
// Mirrors the server-fetch pattern in features/auth/serverAuth.ts.

export type CmsBlockType = "hero" | "rich_text" | "faq" | "cta";

export interface CmsBlock {
  block_type: CmsBlockType | string;
  sort_order: number;
  content: Record<string, unknown>;
}

export interface CmsPage {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  locale: string;
  status: string;
  published_at: string | null;
  blocks: CmsBlock[];
}

export interface CmsPageListItem {
  slug: string;
  locale: string;
  updated_at: string;
}

/** Card shown on the guide index and in a guide's related list (T45). */
export interface CmsGuideCard {
  slug: string;
  title: string;
  meta_description: string;
  category: string;
}

/** Full study-guide payload: CMS blocks plus simple related guides (T45). */
export interface CmsGuideDetail {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  category: string;
  locale: string;
  published_at: string | null;
  blocks: CmsBlock[];
  related: CmsGuideCard[];
}

const API_URL = process.env.API_URL ?? "http://django:8000";

/** Fetch a single published page by slug + locale. Returns null on 404/error. */
export async function fetchCmsPage(
  slug: string,
  locale: string,
): Promise<CmsPage | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/cms/pages/${encodeURIComponent(slug)}/?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as CmsPage;
  } catch {
    return null;
  }
}

/** Fetch all published pages (for the sitemap). Returns [] on error. */
export async function fetchPublishedCmsPages(): Promise<CmsPageListItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cms/pages/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as CmsPageListItem[];
  } catch {
    return [];
  }
}

/** Fetch published study-guide cards for a locale (T45). Returns [] on error. */
export async function fetchGuides(locale: string): Promise<CmsGuideCard[]> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/cms/guides/?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    return (await res.json()) as CmsGuideCard[];
  } catch {
    return [];
  }
}

/** Fetch a single published guide by slug + locale (T45). Null on 404/error. */
export async function fetchGuide(
  slug: string,
  locale: string,
): Promise<CmsGuideDetail | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/cms/guides/${encodeURIComponent(slug)}/?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as CmsGuideDetail;
  } catch {
    return null;
  }
}
