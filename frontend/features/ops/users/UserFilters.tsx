import React from "react";
import { Search } from "lucide-react";
import { Button, Label } from "@/components/ui";
import type { OpsUserStatus, ContentExam } from "./userService";

/**
 * UserFilters — OPS-06A (Filters + Search).
 *
 * All filtering and search are SERVER-SIDE (OPS-BE-01 query params) — this is a
 * controlled presentation component that only reports changes upward. Status,
 * role and target-exam selects apply on change; the search box applies on submit
 * (Enter / button). No client-side filtering, indexing or fuzzy matching.
 * Read-only; semantic tokens only; English-only.
 */
const CONTROL_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const STATUS_OPTIONS: { value: OpsUserStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
];

export interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  status: string;
  role: string;
  targetExam: string;
  onStatusChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onTargetExamChange: (value: string) => void;
  roleOptions: readonly string[];
  examOptions: readonly Pick<ContentExam, "id" | "name">[];
}

export function UserFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  status,
  role,
  targetExam,
  onStatusChange,
  onRoleChange,
  onTargetExamChange,
  roleOptions,
  examOptions,
}: UserFiltersProps) {
  return (
    <section
      aria-label="User filters"
      className="space-y-3 rounded-lg border border-border bg-card p-3"
    >
      {/* Server-side search (applies on submit) */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit();
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1 space-y-1">
          <Label htmlFor="user-search" className="text-xs">
            Search users
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="user-search"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="user-filter-status" className="text-xs">
            Status
          </Label>
          <select
            id="user-filter-status"
            aria-label="Status"
            className={CONTROL_CLASS}
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="user-filter-role" className="text-xs">
            Role
          </Label>
          <select
            id="user-filter-role"
            aria-label="Role"
            className={CONTROL_CLASS}
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="user-filter-exam" className="text-xs">
            Target exam
          </Label>
          <select
            id="user-filter-exam"
            aria-label="Target exam"
            className={CONTROL_CLASS}
            value={targetExam}
            onChange={(e) => onTargetExamChange(e.target.value)}
          >
            <option value="">All exams</option>
            {examOptions.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
