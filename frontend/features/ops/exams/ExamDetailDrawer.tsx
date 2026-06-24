import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui";

/**
 * ExamDetailDrawer — OPS-05.
 *
 * READ-ONLY detail for an exam or a hierarchy node (subject / topic / subtopic):
 * metadata rows plus relationships (child names, counts). No create / edit /
 * delete / reorder — only Close. Presentational: the workspace supplies the
 * resolved `data` (and a loading flag while exam counts are fetched).
 * English-only; Radix supplies focus trap/restore, Escape, aria-modal.
 */
export interface ExamDrawerRow {
  label: string;
  value: string;
}

export interface ExamDrawerData {
  kind: "Exam" | "Subject" | "Topic" | "Subtopic";
  title: string;
  rows: ExamDrawerRow[];
  relationships?: { label: string; items: string[] };
}

function MetaRow({ label, value }: ExamDrawerRow) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export interface ExamDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ExamDrawerData | null;
  loading?: boolean;
}

export function ExamDetailDrawer({
  open,
  onOpenChange,
  data,
  loading = false,
}: ExamDetailDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Exam details"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                {data ? data.title : "Details"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                {data ? `${data.kind} · read-only` : "Read-only view"}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close details"
              className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {loading ? (
              <div role="status" aria-label="Loading details" className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !data ? (
              <p className="text-sm text-muted-foreground">Nothing selected.</p>
            ) : (
              <>
                <section aria-label="Metadata">
                  <dl className="divide-y divide-border">
                    {data.rows.map((row) => (
                      <MetaRow key={row.label} {...row} />
                    ))}
                  </dl>
                </section>

                {data.relationships && (
                  <section aria-label="Relationships">
                    <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {data.relationships.label} ({data.relationships.items.length})
                    </h3>
                    {data.relationships.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None</p>
                    ) : (
                      <ul className="space-y-1">
                        {data.relationships.items.map((item, i) => (
                          <li
                            key={`${item}-${i}`}
                            className="rounded-md border border-border px-2 py-1 text-sm text-foreground"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
