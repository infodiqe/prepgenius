import React from "react";
import { Eye } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { UserStatusBadge } from "./UserStatusBadge";
import {
  formatDate,
  rolesLabel,
  userDisplayName,
  type OpsUserListItem,
} from "./userService";

/**
 * UserTable — OPS-06A (Section 1).
 *
 * READ-ONLY listing backed by GET /ops/users/ (OPS-BE-01). Columns are the
 * fields the list API returns: Name, Email, Status, Roles, Target Exam, Joined.
 * Selecting a row opens the read-only detail drawer. No edit / suspend / role /
 * credit actions. Accessible table semantics; English-only.
 *
 * `forbidden` / `unauthorized` surface the RBAC-gated API responses (403 / 401);
 * the empty state appears only after a successful, empty `ready` load.
 */
export type UserTablePhase =
  | "loading"
  | "error"
  | "forbidden"
  | "unauthorized"
  | "ready";

const COLUMNS = [
  "Name",
  "Email",
  "Status",
  "Roles",
  "Target Exam",
  "Joined",
] as const;

export interface UserTableProps {
  phase: UserTablePhase;
  users: OpsUserListItem[];
  onOpen: (user: OpsUserListItem) => void;
  onRetry: () => void;
}

function Notice({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
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

export function UserTable({ phase, users, onOpen, onRetry }: UserTableProps) {
  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading users"
        className="space-y-2"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (phase === "unauthorized") {
    return (
      <Notice
        title="Sign in required"
        body="Your session has expired. Please sign in again to view users."
      />
    );
  }

  if (phase === "forbidden") {
    return (
      <Notice
        title="Access denied"
        body="Your role does not have access to the User 360 workspace."
      />
    );
  }

  if (phase === "error") {
    return (
      <Notice
        title="Could not load users"
        body="Something went wrong while fetching from the server."
        onRetry={onRetry}
      />
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">No users found</p>
        <p className="text-sm text-muted-foreground">
          No users match the current search and filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Users</caption>
        <thead className="bg-muted/50">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col}
                scope="col"
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {col}
              </th>
            ))}
            <th scope="col" className="w-16 px-3 py-2 text-left">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const name = userDisplayName(user);
            return (
              <tr
                key={user.id}
                onClick={() => onOpen(user)}
                className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
              >
                <td className="max-w-xs px-3 py-2 align-middle">
                  <span className="line-clamp-1 font-medium text-foreground">
                    {name}
                  </span>
                </td>
                <td className="max-w-xs px-3 py-2 align-middle">
                  <span className="line-clamp-1 text-muted-foreground">
                    {user.email}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle">
                  <UserStatusBadge status={user.status} />
                </td>
                <td className="px-3 py-2 align-middle text-foreground">
                  {rolesLabel(user.roles)}
                </td>
                <td className="px-3 py-2 align-middle text-muted-foreground">
                  {user.target_exam ? user.target_exam.name : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-middle text-muted-foreground">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-3 py-2 align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(user);
                    }}
                    aria-label={`Open user ${name}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
