"use client";

import React from "react";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { ROLES } from "@/lib/rbac/types";
import { UserFilters } from "./UserFilters";
import { UserTable, type UserTablePhase } from "./UserTable";
import { UserDetailDrawer, type DetailPhase } from "./UserDetailDrawer";
import { type AnalyticsPhase } from "./UserAnalyticsPanel";
import {
  getOpsUser,
  getOpsUserSummary,
  listExams,
  listOpsUsers,
  userDisplayName,
  type ContentExam,
  type OpsUser,
  type OpsUserListItem,
  type OpsUserListParams,
  type OpsUserSummary,
} from "./userService";

/**
 * UserWorkspace — OPS-06A orchestrator (User 360, read-only).
 *
 * Backed entirely by the OPS-BE-01 operational APIs: a server-paginated,
 * searchable, filterable user list; a read-only detail drawer (GET
 * /ops/users/{id}/); and an operational summary (GET /ops/users/{id}/summary/).
 * All search/filter/pagination is server-side — no client-side filtering, no
 * page math, cursors used verbatim. The backend is the source of truth and the
 * RBAC gate (403/401 surface as access states). English-only.
 */
const ROLE_OPTIONS: readonly string[] = [
  ...Object.values(ROLES),
  "support",
  "operations",
];

export function UserWorkspace() {
  // ── List state ───────────────────────────────────────────────────────────
  const [params, setParams] = React.useState<OpsUserListParams>({});
  const [searchInput, setSearchInput] = React.useState("");
  const [users, setUsers] = React.useState<OpsUserListItem[]>([]);
  const [phase, setPhase] = React.useState<UserTablePhase>("loading");
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [prevCursor, setPrevCursor] = React.useState<string | null>(null);

  const [examOptions, setExamOptions] = React.useState<ContentExam[]>([]);

  // ── Drawer state ─────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] =
    React.useState<OpsUserListItem | null>(null);
  const [detailUser, setDetailUser] = React.useState<OpsUser | null>(null);
  const [detailPhase, setDetailPhase] = React.useState<DetailPhase>("loading");
  const [summary, setSummary] = React.useState<OpsUserSummary | null>(null);
  const [summaryPhase, setSummaryPhase] =
    React.useState<AnalyticsPhase>("loading");

  // ── Loads ──────────────────────────────────────────────────────────────
  const load = React.useCallback(async (p: OpsUserListParams) => {
    setPhase("loading");
    try {
      const page = await listOpsUsers(p);
      setUsers(page.results);
      setNextCursor(page.nextCursor);
      setPrevCursor(page.prevCursor);
      setPhase("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setPhase("forbidden");
      else if (err instanceof ApiError && err.status === 401)
        setPhase("unauthorized");
      else setPhase("error");
    }
  }, []);

  React.useEffect(() => {
    void load(params);
  }, [params, load]);

  // Exam options for the target-exam filter (existing /exams/ endpoint). A
  // failure here is non-fatal — the filter simply shows no exam options.
  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const exams = await listExams();
        if (active) setExamOptions(exams);
      } catch {
        /* options unavailable */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── Filter / search / pagination handlers (all reset to the first page) ──
  const setFilter = (patch: Partial<OpsUserListParams>) =>
    setParams((p) => ({ ...p, ...patch, cursor: undefined }));

  const goToCursor = (cursor: string | null) => {
    if (cursor) setParams((p) => ({ ...p, cursor }));
  };

  // ── Drawer ─────────────────────────────────────────────────────────────
  const loadDetail = React.useCallback(async (id: string) => {
    setDetailPhase("loading");
    setDetailUser(null);
    setSummaryPhase("loading");
    setSummary(null);
    try {
      setDetailUser(await getOpsUser(id));
      setDetailPhase("ready");
    } catch {
      setDetailPhase("error");
    }
    try {
      setSummary(await getOpsUserSummary(id));
      setSummaryPhase("ready");
    } catch {
      setSummaryPhase("error");
    }
  }, []);

  const openUser = React.useCallback(
    (row: OpsUserListItem) => {
      setSelectedRow(row);
      setDrawerOpen(true);
      void loadDetail(row.id);
    },
    [loadDetail],
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <UserFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setFilter({ search: searchInput.trim() })}
        status={params.status ?? ""}
        role={params.role ?? ""}
        targetExam={params.target_exam ?? ""}
        onStatusChange={(status) => setFilter({ status })}
        onRoleChange={(role) => setFilter({ role })}
        onTargetExamChange={(target_exam) => setFilter({ target_exam })}
        roleOptions={ROLE_OPTIONS}
        examOptions={examOptions}
      />

      <UserTable
        phase={phase}
        users={users}
        onOpen={openUser}
        onRetry={() => void load(params)}
      />

      {phase === "ready" && users.length > 0 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-end gap-2"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!prevCursor}
            onClick={() => goToCursor(prevCursor)}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!nextCursor}
            onClick={() => goToCursor(nextCursor)}
            aria-label="Next page"
          >
            Next
          </Button>
        </nav>
      )}

      <UserDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        fallbackName={selectedRow ? userDisplayName(selectedRow) : undefined}
        user={detailUser}
        detailPhase={detailPhase}
        onRetryDetail={() => selectedRow && void loadDetail(selectedRow.id)}
        examName={selectedRow?.target_exam?.name}
        summary={summary}
        summaryPhase={summaryPhase}
      />
    </div>
  );
}
