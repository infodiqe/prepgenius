import React from "react";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  Sparkles,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Status badge for AI jobs and drafts. State is conveyed by THREE redundant
 * channels — colour + icon + text label — so colour is never the sole signal
 * (WCAG 1.4.1). Job and draft status values are disjoint, so one map covers both.
 */
interface BadgeStyle {
  label: string;
  Icon: LucideIcon;
  className: string;
  spin?: boolean;
}

const STYLES: Record<string, BadgeStyle> = {
  // Jobs
  pending: { label: "Pending", Icon: CircleDashed, className: "bg-muted text-muted-foreground" },
  running: { label: "Running", Icon: Loader2, className: "bg-blue-500/10 text-blue-500", spin: true },
  completed: { label: "Completed", Icon: CheckCircle2, className: "bg-green-500/10 text-green-500" },
  failed: { label: "Failed", Icon: XCircle, className: "bg-destructive/10 text-destructive" },
  // Drafts
  generated: { label: "Generated", Icon: Sparkles, className: "bg-blue-500/10 text-blue-500" },
  imported: { label: "Imported", Icon: CheckCircle2, className: "bg-green-500/10 text-green-500" },
  discarded: { label: "Discarded", Icon: Trash2, className: "bg-muted text-muted-foreground" },
};

export function AiStatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STYLES[status];
  if (!style) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {status}
      </span>
    );
  }
  const { label, Icon, spin } = style;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        style.className,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", spin && "animate-spin")} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
