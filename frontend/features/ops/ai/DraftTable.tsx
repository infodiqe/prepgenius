import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { AiStatusBadge } from "./AiStatusBadge";
import { formatDate, type AiDraftListItem, type LoadPhase } from "./aiDraftService";

/**
 * DraftTable — Section B listing. Server-driven; selecting a row opens the
 * read-only preview drawer. Sortable columns emit an `ordering` string the
 * server understands. Accessible table semantics + sort button state.
 */
export interface DraftTableProps {
  phase: LoadPhase;
  drafts: AiDraftListItem[];
  ordering: string;
  onSort: (field: string) => void;
  onOpen: (draft: AiDraftListItem) => void;
  onRetry: () => void;
}

const SORTABLE: { key: string; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "exam", label: "Exam" },
  { key: "subject", label: "Subject" },
  { key: "difficulty", label: "Difficulty" },
  { key: "language", label: "Language" },
  { key: "provider", label: "Provider" },
  { key: "created_at", label: "Created" },
];

function Notice({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

function SortHeader({
  field,
  label,
  ordering,
  onSort,
}: {
  field: string;
  label: string;
  ordering: string;
  onSort: (f: string) => void;
}) {
  const active = ordering === field || ordering === `-${field}`;
  const descending = ordering === `-${field}`;
  const Icon = !active ? ArrowUpDown : descending ? ArrowDown : ArrowUp;
  return (
    <th scope="col" className="px-3 py-2 font-medium" aria-sort={!active ? "none" : descending ? "descending" : "ascending"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );
}

export function DraftTable({ phase, drafts, ordering, onSort, onOpen, onRetry }: DraftTableProps) {
  if (phase === "loading") {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading drafts">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (phase === "forbidden") {
    return <Notice title="Access denied" body="You do not have permission to view AI drafts." />;
  }
  if (phase === "unauthorized") {
    return <Notice title="Session expired" body="Please sign in again to view AI drafts." />;
  }
  if (phase === "error") {
    return <Notice title="Couldn't load drafts" body="Something went wrong loading drafts." onRetry={onRetry} />;
  }
  if (phase === "empty") {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground"
      >
        No drafts match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <caption className="sr-only">AI-generated question drafts</caption>
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Question
            </th>
            {SORTABLE.map((s) => (
              <SortHeader key={s.key} field={s.key} label={s.label} ordering={ordering} onSort={onSort} />
            ))}
            <th scope="col" className="px-3 py-2 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {drafts.map((d) => (
            <tr key={d.id} className="hover:bg-muted/30">
              <td className="px-3 py-2">
                <p className="max-w-[22rem] truncate font-medium text-foreground" title={d.stem}>
                  {d.stem}
                </p>
                <p className="text-[11px] text-muted-foreground">{d.topic}</p>
              </td>
              <td className="px-3 py-2">
                <AiStatusBadge status={d.status} />
              </td>
              <td className="px-3 py-2">{d.exam}</td>
              <td className="px-3 py-2">{d.subject}</td>
              <td className="px-3 py-2">{d.difficulty}</td>
              <td className="px-3 py-2 uppercase">{d.language}</td>
              <td className="px-3 py-2">{d.provider || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(d.created_at)}</td>
              <td className="px-3 py-2 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpen(d)}
                  aria-label={`Preview draft: ${d.stem}`}
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
