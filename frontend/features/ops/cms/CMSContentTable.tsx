import React from "react";
import { Eye } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { CMSStatusBadge } from "./CMSStatusBadge";
import type { CmsContentItem } from "./cmsService";

/**
 * CMSContentTable — OPS-04.
 *
 * Read-only listing of CMS content (pages + guides) with loading / empty / error
 * / ready states. Selecting a row opens the detail drawer. No edit / publish /
 * archive / workflow actions. English-only; accessible table semantics.
 */
export type CmsTablePhase = "loading" | "error" | "ready";

export interface CMSContentTableProps {
  phase: CmsTablePhase;
  items: CmsContentItem[];
  onOpen: (item: CmsContentItem) => void;
  onRetry: () => void;
}

const COLUMNS = [
  "Title",
  "Slug",
  "Type",
  "Status",
  "Locale",
  "Category",
  "Updated",
] as const;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CMSContentTable({
  phase,
  items,
  onOpen,
  onRetry,
}: CMSContentTableProps) {
  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading content"
        className="space-y-2"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center"
      >
        <p className="text-sm font-medium text-foreground">
          Could not load content
        </p>
        <p className="text-sm text-muted-foreground">
          Something went wrong while fetching from the server.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">No content found</p>
        <p className="text-sm text-muted-foreground">
          Nothing published in this view yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">CMS content</caption>
        <thead className="bg-muted/50">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col}
                scope="col"
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {col}
              </th>
            ))}
            <th scope="col" className="w-16 px-3 py-2 text-left">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.type}:${item.slug}:${item.locale}`}
              className="border-t border-border transition-colors hover:bg-muted/40"
            >
              <td className="max-w-xs px-3 py-2 align-middle">
                <span className="line-clamp-1 text-foreground">{item.title}</span>
              </td>
              <td className="px-3 py-2 align-middle">
                <span className="font-mono text-xs text-muted-foreground">
                  {item.slug}
                </span>
              </td>
              <td className="px-3 py-2 align-middle capitalize text-foreground">
                {item.type}
              </td>
              <td className="px-3 py-2 align-middle">
                <CMSStatusBadge status={item.status} />
              </td>
              <td className="px-3 py-2 align-middle uppercase text-muted-foreground">
                {item.locale}
              </td>
              <td className="px-3 py-2 align-middle text-muted-foreground">
                {item.category ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 align-middle text-muted-foreground">
                {formatDate(item.updatedAt)}
              </td>
              <td className="px-3 py-2 align-middle">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpen(item)}
                  aria-label={`Open ${item.type} ${item.slug}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
