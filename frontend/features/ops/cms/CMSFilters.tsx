import React from "react";
import { Label } from "@/components/ui";
import { AwaitingBackendNote } from "../content/AwaitingBackendNote";

/**
 * CMSFilters — OPS-04.
 *
 * Content-type filter maps to the distinct Pages / Guides endpoints (data-source
 * selection, not client-side filtering). The status filter is rendered DISABLED
 * with an "Awaiting backend support" note: the public API exposes published
 * content only and has no status query parameter. English-only.
 */
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export type CmsTypeFilter = "all" | "page" | "guide";

export interface CMSFiltersProps {
  contentType: CmsTypeFilter;
  onContentTypeChange: (value: CmsTypeFilter) => void;
  /** Locked when the active section already fixes the content type. */
  contentTypeDisabled?: boolean;
}

export function CMSFilters({
  contentType,
  onContentTypeChange,
  contentTypeDisabled = false,
}: CMSFiltersProps) {
  return (
    <section
      aria-label="Content filters"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl"
    >
      <div className="space-y-1">
        <Label htmlFor="cms-filter-type" className="text-xs">
          Content type
        </Label>
        <select
          id="cms-filter-type"
          className={SELECT_CLASS}
          value={contentType}
          disabled={contentTypeDisabled}
          onChange={(e) => onContentTypeChange(e.target.value as CmsTypeFilter)}
        >
          <option value="all">All</option>
          <option value="page">Pages</option>
          <option value="guide">Guides</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cms-filter-status" className="text-xs">
          Status
        </Label>
        <select
          id="cms-filter-status"
          className={SELECT_CLASS}
          disabled
          aria-describedby="cms-status-note"
        >
          <option>Published</option>
        </select>
        <AwaitingBackendNote>
          <span id="cms-status-note">
            Status filter awaiting backend support (published content only).
          </span>
        </AwaitingBackendNote>
      </div>
    </section>
  );
}
