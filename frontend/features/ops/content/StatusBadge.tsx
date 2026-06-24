import React from "react";
import {
  CheckCircle2,
  CircleDashed,
  Eye,
  Globe,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentReviewStatus } from "./contentService";

/**
 * StatusBadge — OPS-02.
 *
 * Operations review-state badge. State is conveyed by THREE redundant channels
 * — semantic colour + icon + text label — so colour is never the sole signal
 * (WCAG 1.4.1 / colorblind-safe). English-only. Uses semantic theme tokens only.
 */

interface BadgeStyle {
  label: string;
  Icon: LucideIcon;
  className: string;
}

const STATUS_STYLES: Record<ContentReviewStatus, BadgeStyle> = {
  draft: {
    label: "Draft",
    Icon: CircleDashed,
    className: "bg-muted text-muted-foreground",
  },
  in_review: {
    label: "In Review",
    Icon: Eye,
    className: "bg-warning text-warning-foreground",
  },
  sme_review: {
    label: "SME Review",
    Icon: ShieldCheck,
    className: "bg-secondary text-secondary-foreground",
  },
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    className: "bg-success text-success-foreground",
  },
  published: {
    label: "Published",
    Icon: Globe,
    className: "bg-primary text-primary-foreground",
  },
  rejected: {
    label: "Rejected",
    Icon: XCircle,
    className: "bg-destructive text-destructive-foreground",
  },
};

/** Human-readable label for a review status (also used outside the badge). */
export function statusLabel(status: ContentReviewStatus): string {
  return STATUS_STYLES[status]?.label ?? status;
}

export function StatusBadge({
  status,
  className,
}: {
  status: ContentReviewStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  // Unknown/unmapped status: render the raw value so nothing silently disappears.
  if (!style) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {status}
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
