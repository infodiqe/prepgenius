"use client";

import React from "react";
import { Button, Skeleton } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { BillingFilters, type LookupPhase } from "./BillingFilters";
import { CreditSummaryPanel } from "./CreditSummaryPanel";
import { CreditBalanceCard } from "./CreditBalanceCard";
import { CreditLedgerTable } from "./CreditLedgerTable";
import { CreditAdjustmentDrawer } from "./CreditAdjustmentDrawer";
import { BillingEmptyState } from "./BillingEmptyState";
import {
  BillingErrorState,
  type BillingErrorVariant,
} from "./BillingErrorState";
import {
  getUserCredits,
  listOpsUsers,
  userDisplayName,
  type OpsUserCredits,
  type OpsUserListItem,
} from "./billingService";

/**
 * BillingWorkspace — OPS-07 orchestrator (read-only + admin adjustment).
 *
 * Operator looks up a learner (server search, OPS-BE-01), views their credit
 * balance + recent ledger (OPS-BE-02), and can apply a server-validated
 * adjustment. The backend is the source of truth: every value is loaded from the
 * API, and after an adjustment the credits are RELOADED (no optimistic update,
 * no client-side credit math). English-only.
 */
type CreditsPhase =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "unauthorized"
  | "forbidden";

export function BillingWorkspace() {
  // ── User lookup ──────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [lookupPhase, setLookupPhase] = React.useState<LookupPhase>("idle");
  const [results, setResults] = React.useState<OpsUserListItem[]>([]);

  const runSearch = React.useCallback(async () => {
    setLookupPhase("loading");
    try {
      const page = await listOpsUsers({ search: search.trim() });
      setResults(page.results);
      setLookupPhase("ready");
    } catch {
      setLookupPhase("error");
    }
  }, [search]);

  // ── Selected user's credits ──────────────────────────────────────────────
  const [selectedUser, setSelectedUser] =
    React.useState<OpsUserListItem | null>(null);
  const [credits, setCredits] = React.useState<OpsUserCredits | null>(null);
  const [creditsPhase, setCreditsPhase] = React.useState<CreditsPhase>("idle");
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  const loadCredits = React.useCallback(async (userId: string) => {
    setCreditsPhase("loading");
    try {
      setCredits(await getUserCredits(userId));
      setCreditsPhase("ready");
    } catch (err) {
      setCredits(null);
      if (err instanceof ApiError && err.status === 403)
        setCreditsPhase("forbidden");
      else if (err instanceof ApiError && err.status === 401)
        setCreditsPhase("unauthorized");
      else setCreditsPhase("error");
    }
  }, []);

  const selectUser = React.useCallback(
    (user: OpsUserListItem) => {
      setSelectedUser(user);
      void loadCredits(user.id);
    },
    [loadCredits],
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <CreditSummaryPanel
        credits={credits}
        loading={creditsPhase === "loading"}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <BillingFilters
            search={search}
            onSearchChange={setSearch}
            onSearchSubmit={() => void runSearch()}
            phase={lookupPhase}
            results={results}
            selectedUserId={selectedUser?.id ?? null}
            onSelectUser={selectUser}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          {!selectedUser && <BillingEmptyState />}

          {selectedUser && creditsPhase === "loading" && (
            <div
              role="status"
              aria-busy="true"
              aria-label="Loading credits"
              className="space-y-3"
            >
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {selectedUser &&
            (creditsPhase === "error" ||
              creditsPhase === "unauthorized" ||
              creditsPhase === "forbidden") && (
              <BillingErrorState
                variant={creditsPhase as BillingErrorVariant}
                onRetry={() => void loadCredits(selectedUser.id)}
              />
            )}

          {selectedUser && creditsPhase === "ready" && credits && (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {userDisplayName(selectedUser)}
                </h2>
                <Button type="button" onClick={() => setAdjustOpen(true)}>
                  Adjust credits
                </Button>
              </div>

              <CreditBalanceCard credits={credits} />

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent ledger
                </h3>
                <CreditLedgerTable entries={credits.recent_ledger} />
              </div>
            </>
          )}
        </div>
      </div>

      {selectedUser && (
        <CreditAdjustmentDrawer
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          userId={selectedUser.id}
          userName={userDisplayName(selectedUser)}
          onAdjusted={() => void loadCredits(selectedUser.id)}
        />
      )}
    </div>
  );
}
