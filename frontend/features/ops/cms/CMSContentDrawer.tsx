"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { CMSStatusBadge } from "./CMSStatusBadge";
import { CMSPreviewPanel } from "./CMSPreviewPanel";
import {
  getGuide,
  getPage,
  type CmsBlock,
  type CmsContentItem,
} from "./cmsService";

/**
 * CMSContentDrawer — OPS-04.
 *
 * READ-ONLY detail + preview for a CMS page or guide. Fetches the full record on
 * open (loading / error / ready states), shows its metadata and a read-only
 * block preview. No edit / publish / archive / workflow actions — only Close.
 * English-only chrome; Radix supplies focus trap/restore, Escape, aria-modal.
 */
interface CmsDetailView {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  locale: string;
  category?: string;
  status: string;
  publishedAt: string | null;
  blocks: CmsBlock[];
}

type DrawerPhase = "loading" | "error" | "ready";

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export interface CMSContentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CmsContentItem | null;
}

export function CMSContentDrawer({
  open,
  onOpenChange,
  item,
}: CMSContentDrawerProps) {
  const [phase, setPhase] = React.useState<DrawerPhase>("loading");
  const [detail, setDetail] = React.useState<CmsDetailView | null>(null);

  const load = React.useCallback(async () => {
    if (!item) return;
    setPhase("loading");
    setDetail(null);
    try {
      if (item.type === "page") {
        const page = await getPage(item.slug, item.locale);
        setDetail({
          title: page.title,
          slug: page.slug,
          metaTitle: page.meta_title,
          metaDescription: page.meta_description,
          locale: page.locale,
          status: page.status,
          publishedAt: page.published_at,
          blocks: page.blocks ?? [],
        });
      } else {
        const guide = await getGuide(item.slug, item.locale);
        setDetail({
          title: guide.title,
          slug: guide.slug,
          metaTitle: guide.meta_title,
          metaDescription: guide.meta_description,
          locale: guide.locale,
          category: guide.category,
          // Guides are served published-only (no status field in the payload).
          status: "published",
          publishedAt: guide.published_at,
          blocks: guide.blocks ?? [],
        });
      }
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [item]);

  React.useEffect(() => {
    if (open && item) void load();
  }, [open, item, load]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="CMS content details"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                Content details
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                Read-only view
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close details"
              className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {!item ? (
              <p className="text-sm text-muted-foreground">
                No content selected.
              </p>
            ) : phase === "loading" ? (
              <div role="status" aria-label="Loading content" className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : phase === "error" || !detail ? (
              <div role="alert" className="flex flex-col items-start gap-3">
                <p className="text-sm text-foreground">Could not load content.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void load()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <section aria-label="Metadata">
                  <div className="mb-2 flex items-center gap-2">
                    <CMSStatusBadge status={detail.status} />
                    <h3 className="text-sm font-semibold text-foreground">
                      {detail.title}
                    </h3>
                  </div>
                  <dl className="divide-y divide-border">
                    <MetaRow label="Slug" value={detail.slug} />
                    <MetaRow label="Type" value={<span className="capitalize">{item.type}</span>} />
                    <MetaRow label="Locale" value={detail.locale} />
                    {detail.category && (
                      <MetaRow label="Category" value={detail.category} />
                    )}
                    <MetaRow label="Meta title" value={detail.metaTitle || "—"} />
                    <MetaRow
                      label="Meta description"
                      value={detail.metaDescription || "—"}
                    />
                    <MetaRow
                      label="Published"
                      value={
                        detail.publishedAt
                          ? new Date(detail.publishedAt).toLocaleString("en-GB")
                          : "—"
                      }
                    />
                  </dl>
                </section>

                <section aria-label="Preview">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Preview
                  </h3>
                  <CMSPreviewPanel blocks={detail.blocks} />
                </section>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
