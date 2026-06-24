import React from "react";
import { BadgeCheck, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentQuestion } from "./contentService";

/**
 * OriginBadge — OPS-STAB-01 (Task 4).
 *
 * Content provenance indicator ("trust is the product"). Like {@link StatusBadge},
 * origin is conveyed by THREE redundant channels — semantic colour + icon + text
 * — so colour is never the sole signal (WCAG 1.4.1 / colorblind-safe).
 *
 * Values come straight from the API (`Question.origin`: official | ai | manual);
 * nothing is fabricated. An unknown/unmapped value renders verbatim so it never
 * silently disappears. English-only; semantic theme tokens only.
 */
export type ContentOrigin = ContentQuestion["origin"];

interface OriginStyle {
  label: string;
  Icon: LucideIcon;
  className: string;
}

const ORIGIN_STYLES: Record<ContentOrigin, OriginStyle> = {
  official: {
    label: "Official",
    Icon: BadgeCheck,
    className: "bg-primary/10 text-primary",
  },
  ai: {
    label: "AI Generated",
    Icon: Sparkles,
    className: "bg-warning/15 text-warning-foreground",
  },
  manual: {
    label: "Human Authored",
    Icon: PenLine,
    className: "bg-muted text-muted-foreground",
  },
};

/** Human-readable label for an origin (also usable outside the badge). */
export function originLabel(origin: ContentOrigin): string {
  return ORIGIN_STYLES[origin]?.label ?? origin;
}

export function OriginBadge({
  origin,
  className,
}: {
  origin: ContentOrigin | null | undefined;
  className?: string;
}) {
  // No origin from the API: render nothing rather than a fabricated value.
  if (!origin) return null;

  const style = ORIGIN_STYLES[origin];
  if (!style) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {origin}
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
