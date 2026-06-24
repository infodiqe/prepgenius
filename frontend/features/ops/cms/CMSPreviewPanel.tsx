import React from "react";
import type { CmsBlock } from "./cmsService";

/**
 * CMSPreviewPanel — OPS-04.
 *
 * READ-ONLY textual preview of a content item's ordered blocks. This is NOT an
 * editor and NOT a drag-and-drop builder — it renders the existing block data so
 * a content manager can inspect what is published. English-only chrome (the
 * content body itself may be in any locale).
 */
function humanizeBlockType(type: string): string {
  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function CMSPreviewPanel({ blocks }: { blocks: CmsBlock[] }) {
  const ordered = [...(blocks ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  if (ordered.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        No content blocks
      </p>
    );
  }

  return (
    <div aria-label="Content preview" className="space-y-3">
      {ordered.map((block, i) => (
        <article
          key={`${block.block_type}-${block.sort_order}-${i}`}
          className="rounded-md border border-border p-3"
        >
          <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {humanizeBlockType(block.block_type)}
          </h4>
          <dl className="space-y-1">
            {Object.entries(block.content ?? {}).map(([key, value]) => (
              <div key={key} className="grid grid-cols-3 gap-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  {key}
                </dt>
                <dd className="col-span-2 whitespace-pre-wrap break-words text-sm text-foreground">
                  {renderValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}
