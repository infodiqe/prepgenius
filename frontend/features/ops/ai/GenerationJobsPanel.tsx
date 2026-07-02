import React from "react";
import { Button, Skeleton } from "@/components/ui";
import { AiStatusBadge } from "./AiStatusBadge";
import {
  formatDate,
  formatDuration,
  jobRemaining,
  type AiGenerationJob,
  type LoadPhase,
} from "./aiDraftService";

/**
 * GenerationJobsPanel — Section A (job table) + Section E (progress bar,
 * completed / failed / remaining). Read-only; the workspace owns loading and
 * the 5s auto-refresh while any job is active. Accessible table + progress bar.
 */
export interface GenerationJobsPanelProps {
  phase: LoadPhase;
  jobs: AiGenerationJob[];
  onRetry: () => void;
  /** True while a background auto-refresh is in flight (for the SR live region). */
  refreshing?: boolean;
}

const COLUMNS = [
  "Status",
  "Progress",
  "Provider",
  "Model",
  "Requested",
  "Generated",
  "Failed",
  "Duration",
  "Created",
] as const;

function ProgressBar({ job }: { job: AiGenerationJob }) {
  const remaining = jobRemaining(job);
  return (
    <div className="min-w-[9rem]">
      <div
        role="progressbar"
        aria-valuenow={job.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Job progress ${job.progress}%`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {job.progress}% · <span className="text-green-600">{job.generated_count} done</span> ·{" "}
        <span className="text-destructive">{job.failed_count} failed</span> · {remaining} remaining
      </p>
    </div>
  );
}

function Notice({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center"
    >
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

export function GenerationJobsPanel({
  phase,
  jobs,
  onRetry,
  refreshing = false,
}: GenerationJobsPanelProps) {
  return (
    <section aria-labelledby="ai-jobs-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="ai-jobs-heading" className="text-base font-semibold text-foreground">
          Generation Jobs
        </h2>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {refreshing ? "Refreshing…" : " "}
        </span>
      </div>

      {phase === "loading" && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading generation jobs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {phase === "forbidden" && (
        <Notice title="Access denied" body="You do not have permission to view AI generation jobs." />
      )}
      {phase === "unauthorized" && (
        <Notice title="Session expired" body="Please sign in again to view generation jobs." />
      )}
      {phase === "error" && (
        <Notice title="Couldn't load jobs" body="Something went wrong loading generation jobs." onRetry={onRetry} />
      )}

      {phase === "empty" && (
        <div
          role="status"
          className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          No generation jobs yet.
        </div>
      )}

      {phase === "ready" && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <caption className="sr-only">AI generation jobs with live progress</caption>
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <AiStatusBadge status={job.status} />
                    {job.status === "failed" && job.error_message && (
                      <p className="mt-1 max-w-[16rem] truncate text-[11px] text-destructive" title={job.error_message}>
                        {job.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <ProgressBar job={job} />
                  </td>
                  <td className="px-3 py-2">{job.provider || "—"}</td>
                  <td className="px-3 py-2">{job.model || "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{job.requested_count}</td>
                  <td className="px-3 py-2 tabular-nums text-green-600">{job.generated_count}</td>
                  <td className="px-3 py-2 tabular-nums text-destructive">{job.failed_count}</td>
                  <td className="px-3 py-2">{formatDuration(job.duration_seconds)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
