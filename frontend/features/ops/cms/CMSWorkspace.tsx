"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AwaitingBackendNote } from "../content/AwaitingBackendNote";
import {
  CMS_SECTIONS,
  listGuides,
  listPages,
  guideToItem,
  pageToItem,
  type CmsContentItem,
  type CmsSectionKey,
} from "./cmsService";
import { CMSFilters, type CmsTypeFilter } from "./CMSFilters";
import { CMSContentTable, type CmsTablePhase } from "./CMSContentTable";
import { CMSContentDrawer } from "./CMSContentDrawer";

/**
 * CMSWorkspace — OPS-04 orchestrator.
 *
 * Section tabs (Pages, Guides, Drafts, Published, Scheduled) over the read-only
 * public CMS API. Data sections fetch from the server; Drafts and Scheduled are
 * "awaiting backend support" (the API exposes published content only and has no
 * scheduling). The content-type filter selects the data source — there is no
 * client-side filtering, no editing, and no workflow. English-only.
 */
async function loadItems(
  section: CmsSectionKey,
  contentType: CmsTypeFilter,
): Promise<CmsContentItem[]> {
  const wantPages =
    section === "pages" ||
    (section === "published" && contentType !== "guide");
  const wantGuides =
    section === "guides" ||
    (section === "published" && contentType !== "page");

  const [pages, guides] = await Promise.all([
    wantPages ? listPages() : Promise.resolve([]),
    wantGuides ? listGuides() : Promise.resolve([]),
  ]);

  return [
    ...pages.map(pageToItem),
    ...guides.map((g) => guideToItem(g)),
  ];
}

export function CMSWorkspace() {
  const [section, setSection] = React.useState<CmsSectionKey>("pages");
  const [contentType, setContentType] = React.useState<CmsTypeFilter>("all");
  const [items, setItems] = React.useState<CmsContentItem[]>([]);
  const [phase, setPhase] = React.useState<CmsTablePhase>("loading");

  const [drawerItem, setDrawerItem] = React.useState<CmsContentItem | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Only data-backed sections are shown. Drafts / Scheduled have no backing API
  // and no functional behaviour, so they are omitted rather than rendered as
  // dead tabs (OPS-STAB-01 Task 5 — prefer omission over deception).
  const visibleSections = CMS_SECTIONS.filter((s) => s.kind === "data");
  const activeSection = CMS_SECTIONS.find((s) => s.key === section)!;
  const isDataSection = activeSection.kind === "data";

  const load = React.useCallback(async () => {
    setPhase("loading");
    try {
      const result = await loadItems(section, contentType);
      setItems(result);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [section, contentType]);

  React.useEffect(() => {
    if (isDataSection) void load();
  }, [isDataSection, load]);

  const openDrawer = React.useCallback((item: CmsContentItem) => {
    setDrawerItem(item);
    setDrawerOpen(true);
  }, []);

  // The Pages / Guides sections fix the content type; Published lets it vary.
  const effectiveType: CmsTypeFilter =
    section === "pages" ? "page" : section === "guides" ? "guide" : contentType;
  const typeLocked = section === "pages" || section === "guides";

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div
        role="group"
        aria-label="CMS sections"
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
      >
        {visibleSections.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={s.key === section ? "true" : "false"}
            onClick={() => setSection(s.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              s.key === section
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s.title}
          </button>
        ))}
      </div>

      {isDataSection ? (
        <>
          <CMSFilters
            contentType={effectiveType}
            onContentTypeChange={setContentType}
            contentTypeDisabled={typeLocked}
          />
          <CMSContentTable
            phase={phase}
            items={items}
            onOpen={openDrawer}
            onRetry={() => void load()}
          />
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="mb-2 text-sm font-medium text-foreground">
            {activeSection.title}
          </p>
          <div className="flex justify-center">
            <AwaitingBackendNote>{activeSection.note}</AwaitingBackendNote>
          </div>
        </div>
      )}

      <CMSContentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={drawerItem}
      />
    </div>
  );
}
