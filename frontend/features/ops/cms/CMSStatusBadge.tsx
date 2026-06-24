import React from "react";
import {
  Archive,
  CalendarClock,
  CircleDashed,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CMSStatusBadge — OPS-04.
 *
 * Publish-status badge for CMS content. State is conveyed by colour + icon +
 * text label (never colour alone — WCAG 1.4.1). Semantic tokens only.
 * The public API returns published content, so "published" is the common case;
 * the other states are mapped for forward-compatibility.
 */
interface BadgeStyle {
  label: string;
  Icon: LucideIcon;
  className: string;
}

const STATUS_STYLES: Record<string, BadgeStyle> = {
  published: {
    label: "Published",
    Icon: Globe,
    className: "bg-success text-success-foreground",
  },
  draft: {
    label: "Draft",
    Icon: CircleDashed,
    className: "bg-muted text-muted-foreground",
  },
  scheduled: {
    label: "Scheduled",
    Icon: CalendarClock,
    className: "bg-warning text-warning-foreground",
  },
  archived: {
    label: "Archived",
    Icon: Archive,
    className: "bg-secondary text-secondary-foreground",
  },
};

export function cmsStatusLabel(status: string): string {
  return STATUS_STYLES[status]?.label ?? status;
}

export function CMSStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
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
