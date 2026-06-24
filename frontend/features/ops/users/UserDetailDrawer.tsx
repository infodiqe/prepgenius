import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { AwaitingBackendNote } from "../content/AwaitingBackendNote";
import { UserStatusBadge } from "./UserStatusBadge";
import {
  UserAnalyticsPanel,
  type AnalyticsPhase,
} from "./UserAnalyticsPanel";
import {
  formatDate,
  rolesLabel,
  userDisplayName,
  type OpsUser,
  type OpsUserSummary,
} from "./userService";

/**
 * UserDetailDrawer — OPS-06A (Section 2 + Sections 3/4/5).
 *
 * READ-ONLY inspection of a user loaded from GET /ops/users/{id}/. No editing,
 * no save buttons, no account / role / status / credit / subscription / password
 * / impersonation actions. It renders ONLY fields the API returns, and only rows
 * whose value exists (no placeholders for absent data). The learning snapshot
 * embeds GET /ops/users/{id}/summary/. Radix provides focus trap/restore,
 * Escape-to-close and aria-modal. English-only.
 */
export type DetailPhase = "loading" | "error" | "ready";

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

export interface UserDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Name shown in the header while the detail loads (from the clicked row). */
  fallbackName?: string;
  user: OpsUser | null;
  detailPhase: DetailPhase;
  onRetryDetail: () => void;
  /** Target-exam display name (from the list row; detail only carries the id). */
  examName?: string;
  summary: OpsUserSummary | null;
  summaryPhase: AnalyticsPhase;
}

export function UserDetailDrawer({
  open,
  onOpenChange,
  fallbackName,
  user,
  detailPhase,
  onRetryDetail,
  examName,
  summary,
  summaryPhase,
}: UserDetailDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="User details"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-semibold text-foreground">
                {user ? userDisplayName(user) : fallbackName || "User details"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                Read-only view
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close details"
              className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {detailPhase === "loading" && (
              <div
                role="status"
                aria-busy="true"
                aria-label="Loading user details"
                className="space-y-3"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            )}

            {detailPhase === "error" && (
              <div
                role="alert"
                className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <p className="text-sm font-medium text-foreground">
                  Could not load user
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetryDetail}
                >
                  Retry
                </Button>
              </div>
            )}

            {detailPhase === "ready" && user && (
              <>
                {/* Profile (only rows whose value exists) */}
                <section aria-label="Profile">
                  <SectionHeading>Profile</SectionHeading>
                  <dl className="divide-y divide-border">
                    <MetaRow label="Name" value={userDisplayName(user)} />
                    <MetaRow label="Email" value={user.email} />
                    {user.phone_e164 && (
                      <MetaRow label="Phone" value={user.phone_e164} />
                    )}
                    {user.preferred_language && (
                      <MetaRow label="Language" value={user.preferred_language} />
                    )}
                  </dl>
                </section>

                {/* Account status */}
                <section aria-label="Account">
                  <SectionHeading>Account</SectionHeading>
                  <dl className="divide-y divide-border">
                    <MetaRow
                      label="Status"
                      value={<UserStatusBadge status={user.status} />}
                    />
                    <MetaRow
                      label="Email verified"
                      value={user.is_email_verified ? "Yes" : "No"}
                    />
                    {typeof user.is_minor === "boolean" && (
                      <MetaRow
                        label="Minor"
                        value={user.is_minor ? "Yes" : "No"}
                      />
                    )}
                  </dl>
                </section>

                {/* Roles */}
                <section aria-label="Roles">
                  <SectionHeading>Roles</SectionHeading>
                  <p className="text-sm text-foreground">
                    {rolesLabel(user.roles)}
                  </p>
                </section>

                {/* Exam & dates (only rows whose value exists) */}
                <section aria-label="Exam and dates">
                  <SectionHeading>Exam &amp; dates</SectionHeading>
                  <dl className="divide-y divide-border">
                    {user.target_exam_id && (
                      <MetaRow
                        label="Target exam"
                        value={examName ?? user.target_exam_id}
                      />
                    )}
                    {user.exam_date && (
                      <MetaRow
                        label="Exam date"
                        value={formatDate(user.exam_date)}
                      />
                    )}
                    <MetaRow label="Joined" value={formatDate(user.created_at)} />
                  </dl>
                </section>

                {/* Section 3 — Learning snapshot */}
                <section aria-label="Learning snapshot">
                  <SectionHeading>Learning snapshot</SectionHeading>
                  <UserAnalyticsPanel phase={summaryPhase} summary={summary} />
                </section>

                {/* Section 4 — Credits (no endpoint) */}
                <section aria-label="Credits">
                  <SectionHeading>Credits</SectionHeading>
                  <AwaitingBackendNote>
                    Credit data is awaiting backend support (no credits endpoint).
                  </AwaitingBackendNote>
                </section>

                {/* Section 5 — Subscription (no endpoint) */}
                <section aria-label="Subscription">
                  <SectionHeading>Subscription</SectionHeading>
                  <AwaitingBackendNote>
                    Subscription data is awaiting backend support (no subscription
                    endpoint).
                  </AwaitingBackendNote>
                </section>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
