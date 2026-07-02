"use client";

import React from "react";
import { Button } from "@/components/ui";
import { GenerationJobsPanel } from "./GenerationJobsPanel";
import { DraftFilters } from "./DraftFilters";
import { DraftTable } from "./DraftTable";
import { DraftPreviewDrawer } from "./DraftPreviewDrawer";
import { ImportDraftDialog } from "./ImportDraftDialog";
import { DiscardDraftDialog } from "./DiscardDraftDialog";
import {
  anyJobActive,
  classifyPhase,
  discardAiDraft,
  getAiDraft,
  importAiDraft,
  listAiDrafts,
  listAiJobs,
  type AiDraftDetail,
  type AiDraftListItem,
  type AiGenerationJob,
  type DraftImportBody,
  type DraftListParams,
  type LoadPhase,
} from "./aiDraftService";
import { ApiError } from "@/lib/errors";

const PAGE_SIZE = 20;
const POLL_MS = 5000;

/**
 * AiOperationsWorkspace — Sprint-6A-07 orchestrator (READ + import/discard).
 *
 * Sections: A/E Generation Jobs (auto-refresh every 5s while any job is active),
 * B Draft list (server filter/search/sort/paginate), C Preview, D Import/Discard.
 * All data is server-authoritative; RBAC 401/403 surface as access states. No
 * duplicate review workflow — Import bridges into the existing Question pipeline.
 */
export function AiOperationsWorkspace() {
  // ── Jobs (A/E) ─────────────────────────────────────────────────────────────
  const [jobs, setJobs] = React.useState<AiGenerationJob[]>([]);
  const [jobsPhase, setJobsPhase] = React.useState<LoadPhase>("loading");
  const [refreshing, setRefreshing] = React.useState(false);

  const loadJobs = React.useCallback(async () => {
    setJobsPhase("loading");
    try {
      const result = await listAiJobs();
      setJobs(result);
      setJobsPhase(result.length === 0 ? "empty" : "ready");
    } catch (err) {
      setJobsPhase(classifyPhase(err));
    }
  }, []);

  const refreshJobs = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await listAiJobs();
      setJobs(result);
      setJobsPhase(result.length === 0 ? "empty" : "ready");
    } catch {
      /* keep last-known jobs on a transient refresh error */
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  // Auto-refresh: poll every 5s only while at least one job is active.
  const hasActiveJobs = anyJobActive(jobs);
  React.useEffect(() => {
    if (!hasActiveJobs) return;
    const id = setInterval(() => void refreshJobs(), POLL_MS);
    return () => clearInterval(id);
  }, [hasActiveJobs, refreshJobs]);

  // ── Drafts (B) ─────────────────────────────────────────────────────────────
  const [params, setParams] = React.useState<DraftListParams>({});
  const [searchInput, setSearchInput] = React.useState("");
  const [ordering, setOrdering] = React.useState("-created_at");
  const [offset, setOffset] = React.useState(0);
  const [drafts, setDrafts] = React.useState<AiDraftListItem[]>([]);
  const [count, setCount] = React.useState(0);
  const [draftsPhase, setDraftsPhase] = React.useState<LoadPhase>("loading");

  const loadDrafts = React.useCallback(async () => {
    setDraftsPhase("loading");
    try {
      const page = await listAiDrafts({ ...params, ordering, limit: PAGE_SIZE, offset });
      setDrafts(page.results);
      setCount(page.count);
      setDraftsPhase(page.results.length === 0 ? "empty" : "ready");
    } catch (err) {
      setDraftsPhase(classifyPhase(err));
    }
  }, [params, ordering, offset]);

  React.useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const setFilter = (patch: Partial<DraftListParams>) => {
    setOffset(0);
    setParams((p) => ({ ...p, ...patch }));
  };
  const onSort = (field: string) => {
    setOffset(0);
    setOrdering((cur) => (cur === field ? `-${field}` : field));
  };

  const examOptions = React.useMemo(
    () => Array.from(new Set(drafts.map((d) => d.exam))).sort(),
    [drafts],
  );

  // ── Preview (C) ────────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AiDraftListItem | null>(null);
  const [detail, setDetail] = React.useState<AiDraftDetail | null>(null);
  const [detailPhase, setDetailPhase] = React.useState<LoadPhase>("loading");

  const loadDetail = React.useCallback(async (id: string) => {
    setDetailPhase("loading");
    setDetail(null);
    try {
      setDetail(await getAiDraft(id));
      setDetailPhase("ready");
    } catch {
      setDetailPhase("error");
    }
  }, []);

  const openPreview = (row: AiDraftListItem) => {
    setSelected(row);
    setPreviewOpen(true);
    void loadDetail(row.id);
  };

  // ── Actions (D) ────────────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const startImport = () => {
    setActionError(null);
    setPreviewOpen(false);
    setImportOpen(true);
  };
  const startDiscard = () => {
    setActionError(null);
    setPreviewOpen(false);
    setDiscardOpen(true);
  };

  const errorMessage = (err: unknown, fallback: string) =>
    err instanceof ApiError && err.message && err.message !== "API request failed"
      ? err.message
      : fallback;

  const confirmImport = async (body: DraftImportBody) => {
    if (!selected) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await importAiDraft(selected.id, body);
      setImportOpen(false);
      await loadDrafts();
    } catch (err) {
      setActionError(errorMessage(err, "Import failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDiscard = async () => {
    if (!selected) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await discardAiDraft(selected.id);
      setDiscardOpen(false);
      await loadDrafts();
    } catch (err) {
      setActionError(errorMessage(err, "Discard failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const from = count === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, count);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < count;

  return (
    <div className="space-y-8">
      <GenerationJobsPanel
        phase={jobsPhase}
        jobs={jobs}
        onRetry={() => void loadJobs()}
        refreshing={refreshing}
      />

      <section aria-labelledby="ai-drafts-heading" className="space-y-3">
        <h2 id="ai-drafts-heading" className="text-base font-semibold text-foreground">
          Generated Drafts
        </h2>

        <DraftFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          onSearchSubmit={() => setFilter({ search: searchInput.trim() })}
          status={params.status ?? ""}
          exam={params.exam ?? ""}
          difficulty={params.difficulty ?? ""}
          language={params.language ?? ""}
          provider={params.provider ?? ""}
          onStatusChange={(status) => setFilter({ status })}
          onExamChange={(exam) => setFilter({ exam })}
          onDifficultyChange={(difficulty) => setFilter({ difficulty })}
          onLanguageChange={(language) => setFilter({ language })}
          onProviderChange={(provider) => setFilter({ provider })}
          examOptions={examOptions}
        />

        <DraftTable
          phase={draftsPhase}
          drafts={drafts}
          ordering={ordering}
          onSort={onSort}
          onOpen={openPreview}
          onRetry={() => void loadDrafts()}
        />

        {draftsPhase === "ready" && (
          <nav aria-label="Draft pagination" className="flex items-center justify-end gap-3 text-sm">
            <span className="text-muted-foreground" aria-live="polite">
              {from}–{to} of {count}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              aria-label="Next page"
            >
              Next
            </Button>
          </nav>
        )}
      </section>

      <DraftPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        phase={detailPhase}
        draft={detail}
        onImport={startImport}
        onDiscard={startDiscard}
        onRetry={() => selected && void loadDetail(selected.id)}
      />

      <ImportDraftDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        draft={selected}
        onConfirm={(body) => void confirmImport(body)}
        submitting={submitting}
        error={actionError}
      />

      <DiscardDraftDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        draft={selected}
        onConfirm={() => void confirmDiscard()}
        submitting={submitting}
        error={actionError}
      />
    </div>
  );
}
