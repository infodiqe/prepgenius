import React from "react";
import { Check, Download, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { AiStatusBadge } from "./AiStatusBadge";
import { formatDate, type AiDraftDetail, type LoadPhase } from "./aiDraftService";

/**
 * DraftPreviewDrawer — Section C (read-only preview) + Section D action buttons.
 * Radix Dialog gives focus trap + Escape. All content is server-provided; no
 * editing. Import/Discard are enabled only for `generated` drafts.
 */
export interface DraftPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: LoadPhase;
  draft: AiDraftDetail | null;
  onImport: () => void;
  onDiscard: () => void;
  onRetry: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{children}</dd>
    </div>
  );
}

export function DraftPreviewDrawer({
  open,
  onOpenChange,
  phase,
  draft,
  onImport,
  onDiscard,
  onRetry,
}: DraftPreviewDrawerProps) {
  const canAct = draft?.status === "generated";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Draft preview</DialogTitle>
          <DialogDescription>Read-only preview of the AI-generated question.</DialogDescription>
        </DialogHeader>

        {phase === "loading" && (
          <div role="status" aria-busy="true" className="py-8 text-center text-sm text-muted-foreground">
            Loading draft…
          </div>
        )}
        {phase === "error" && (
          <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Couldn't load this draft.</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {phase === "ready" && draft && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <AiStatusBadge status={draft.status} />
              <span className="text-xs text-muted-foreground">{draft.question_type}</span>
            </div>

            {/* Question + options */}
            <section aria-label="Question">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Question</h3>
              <p className="text-sm text-foreground">{draft.stem}</p>
              <ul className="mt-3 space-y-1.5">
                {draft.options.map((o) => (
                  <li
                    key={o.label}
                    className={
                      o.is_correct
                        ? "flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/5 p-2 text-sm"
                        : "flex items-start gap-2 rounded-md border border-border p-2 text-sm"
                    }
                  >
                    <span className="font-semibold">{o.label}.</span>
                    <span className="flex-1">{o.text}</span>
                    {o.is_correct && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Correct
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Explanation">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Explanation</h3>
              <p className="text-sm text-muted-foreground">{draft.explanation || "—"}</p>
            </section>

            {/* Validation warnings */}
            {draft.validation_report?.warnings?.length > 0 && (
              <section aria-label="Validation warnings">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Validation warnings</h3>
                <ul className="list-inside list-disc text-sm text-amber-600">
                  {draft.validation_report.warnings.map((w) => (
                    <li key={w.code}>{w.message}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Metadata */}
            <section aria-label="Details">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Details</h3>
              <dl className="divide-y divide-border">
                <Row label="Correct answer">{draft.correct_answer || "—"}</Row>
                <Row label="Difficulty">{draft.difficulty}</Row>
                <Row label="Bloom">{draft.bloom_level}</Row>
                <Row label="Estimated time">{draft.estimated_time}s</Row>
                <Row label="Learning objective">{draft.learning_objective || "—"}</Row>
                <Row label="Tags">{draft.tags.length ? draft.tags.join(", ") : "—"}</Row>
                <Row label="Language">{draft.language}</Row>
                <Row label="Provider">{draft.provider || "—"}</Row>
                <Row label="Model">{draft.model || "—"}</Row>
                <Row label="Prompt type">{draft.prompt_type}</Row>
                <Row label="Created by">{draft.created_by_email ?? "—"}</Row>
                <Row label="Created at">{formatDate(draft.created_at)}</Row>
              </dl>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onDiscard}
                disabled={!canAct}
                aria-label="Discard draft"
              >
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Discard
              </Button>
              <Button type="button" onClick={onImport} disabled={!canAct} aria-label="Import draft">
                <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Import
              </Button>
            </div>
            {!canAct && (
              <p className="text-right text-xs text-muted-foreground">
                Only generated drafts can be imported or discarded.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
