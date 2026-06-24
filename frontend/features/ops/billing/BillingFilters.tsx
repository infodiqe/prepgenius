import React from "react";
import { Search } from "lucide-react";
import { Button, Label, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { userDisplayName, type OpsUserListItem } from "./billingService";

/**
 * BillingFilters — OPS-07 (Part B, user lookup).
 *
 * SERVER-SIDE user lookup that reuses GET /ops/users/ (OPS-BE-01) — no local
 * index, no client filtering. The operator searches by name/email and selects a
 * user whose credits the workspace then loads. Controlled by the workspace.
 * Accessible: labelled search, a selectable list with `aria-pressed`.
 * English-only.
 */
export type LookupPhase = "idle" | "loading" | "error" | "ready";

export interface BillingFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  phase: LookupPhase;
  results: OpsUserListItem[];
  selectedUserId: string | null;
  onSelectUser: (user: OpsUserListItem) => void;
}

const CONTROL_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BillingFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  phase,
  results,
  selectedUserId,
  onSelectUser,
}: BillingFiltersProps) {
  return (
    <section
      aria-label="User lookup"
      className="space-y-3 rounded-lg border border-border bg-card p-3"
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit();
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1 space-y-1">
          <Label htmlFor="billing-user-search" className="text-xs">
            Find a user
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="billing-user-search"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or email…"
              className={`${CONTROL_CLASS} pl-9`}
            />
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Search
        </Button>
      </form>

      {phase === "loading" && (
        <div role="status" aria-busy="true" aria-label="Loading users" className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {phase === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Could not search users. Please try again.
        </p>
      )}

      {phase === "ready" && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No users match your search.</p>
      )}

      {phase === "ready" && results.length > 0 && (
        <ul aria-label="Search results" className="space-y-1">
          {results.map((user) => {
            const selected = user.id === selectedUserId;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectUser(user)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-md border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {userDisplayName(user)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
