import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Empty State framework — Sprint 1 · T04.
 *
 * Composable, feature-agnostic primitives for "no data yet" / "nothing here"
 * surfaces shared by dashboard, analytics, results, profile, tutor, mock tests
 * and review/admin workspaces. Composition (consumer supplies content):
 *
 *   <EmptyState>
 *     <EmptyStateIcon><Inbox /></EmptyStateIcon>
 *     <EmptyStateTitle>No results yet</EmptyStateTitle>
 *     <EmptyStateDescription>Take a mock test to see analytics.</EmptyStateDescription>
 *     <EmptyStateAction><Button>Start a mock</Button></EmptyStateAction>
 *   </EmptyState>
 *
 * Semantics: `EmptyStateTitle` is a real heading (default <h2>, override via
 * `as`) so screen readers expose structure; `EmptyStateIcon` is decorative
 * (`aria-hidden`); the action area simply lays out whatever interactive
 * elements the consumer drops in (they own their own keyboard behaviour).
 * Colour comes only from `--foreground` / `--muted` tokens (light + dark).
 */

/** Centered container that stacks icon, title, description and action. */
const EmptyState = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
      className,
    )}
    {...props}
  />
));
EmptyState.displayName = "EmptyState";

/** Decorative icon badge. Wraps a (lucide) icon in a muted circle. */
const EmptyStateIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn(
      "mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:h-6 [&_svg]:w-6",
      className,
    )}
    {...props}
  />
));
EmptyStateIcon.displayName = "EmptyStateIcon";

interface EmptyStateTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level — pick the one that fits the surrounding outline. */
  as?: `h${1 | 2 | 3 | 4 | 5 | 6}`;
}

/** Primary message, rendered as a real heading for screen-reader structure. */
const EmptyStateTitle = React.forwardRef<
  HTMLHeadingElement,
  EmptyStateTitleProps
>(({ as: Comp = "h2", className, ...props }, ref) => (
  <Comp
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
EmptyStateTitle.displayName = "EmptyStateTitle";

/** Supporting text; width-capped for readable line length. */
const EmptyStateDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("max-w-sm text-sm text-muted-foreground", className)}
    {...props}
  />
));
EmptyStateDescription.displayName = "EmptyStateDescription";

/** Action area: stacks on mobile, inline row from `sm` up. */
const EmptyStateAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-2 flex flex-col items-center gap-2 sm:flex-row sm:justify-center",
      className,
    )}
    {...props}
  />
));
EmptyStateAction.displayName = "EmptyStateAction";

export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
};
export type { EmptyStateTitleProps };
