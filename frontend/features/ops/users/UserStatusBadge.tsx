import React from "react";
import {
  CheckCircle2,
  CircleDashed,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpsUserStatus } from "./userService";

/**
 * UserStatusBadge — OPS-06.
 *
 * Account-status badge for the User 360 workspace. State is conveyed by THREE
 * redundant channels — semantic colour + icon + text label — so colour is never
 * the sole signal (WCAG 1.4.1 / colorblind-safe). Read-only; semantic tokens
 * only; English-only.
 */
interface BadgeStyle {
  label: string;
  Icon: LucideIcon;
  className: string;
}

const STATUS_STYLES: Record<OpsUserStatus, BadgeStyle> = {
  pending: {
    label: "Pending",
    Icon: CircleDashed,
    className: "bg-muted text-muted-foreground",
  },
  active: {
    label: "Active",
    Icon: CheckCircle2,
    className: "bg-success text-success-foreground",
  },
  suspended: {
    label: "Suspended",
    Icon: PauseCircle,
    className: "bg-warning text-warning-foreground",
  },
  deleted: {
    label: "Deleted",
    Icon: XCircle,
    className: "bg-destructive text-destructive-foreground",
  },
};

/** Human-readable label for an account status (also used outside the badge). */
export function userStatusLabel(status: OpsUserStatus | string): string {
  return STATUS_STYLES[status as OpsUserStatus]?.label ?? String(status);
}

export function UserStatusBadge({
  status,
  className,
}: {
  status: OpsUserStatus | string;
  className?: string;
}) {
  const style = STATUS_STYLES[status as OpsUserStatus];
  // Unknown/unmapped status: render the raw value so nothing silently disappears.
  if (!style) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {String(status)}
      </span>
    );
  }
  const { label, Icon } = style;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        style.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
