import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Skeleton framework — Sprint 1 · T03.
 *
 * Reusable loading placeholders shared by auth, registration, onboarding,
 * dashboard, profile, results, tutor and mock workflows. Two layers:
 *
 *   1. Shapes  (`Skeleton`, `SkeletonAvatar`) — purely decorative pulsing
 *      blocks. `aria-hidden` by default so they never pollute the a11y tree.
 *   2. Regions (`SkeletonText`, `SkeletonCard`, `SkeletonList`, `SkeletonStat`)
 *      — composite placeholders that own the `role="status"` / `aria-busy`
 *      semantics and carry a visually-hidden label for screen readers.
 *
 * Colour comes only from the `--muted` token (light + dark). Animation is the
 * built-in `animate-pulse`, suppressed under `prefers-reduced-motion` via the
 * `motion-reduce:animate-none` utility.
 */

const DEFAULT_LABEL = "Loading…";

/** Base pulsing block. Decorative by default; override `aria-hidden` to expose. */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn(
      "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

/** Props common to every composite region. */
interface SkeletonRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Screen-reader label announced while content loads. */
  label?: string;
}

/** Wrapper that applies the live-region semantics + visually-hidden label. */
const SkeletonRegion = React.forwardRef<HTMLDivElement, SkeletonRegionProps>(
  ({ label = DEFAULT_LABEL, className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(className)}
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  ),
);
SkeletonRegion.displayName = "SkeletonRegion";

const AVATAR_SIZES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof AVATAR_SIZES;
}

/** Circular shape for avatar/profile-image placeholders. Decorative. */
const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = "md", className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      className={cn("shrink-0 rounded-full", AVATAR_SIZES[size], className)}
      {...props}
    />
  ),
);
SkeletonAvatar.displayName = "SkeletonAvatar";

interface SkeletonTextProps extends SkeletonRegionProps {
  /** Number of text lines to render. */
  lines?: number;
}

/** Multi-line text placeholder; the final line is shortened for realism. */
const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, label, className, ...props }, ref) => (
    <SkeletonRegion
      ref={ref}
      label={label}
      className={cn("space-y-2", className)}
      {...props}
    >
      {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && lines > 1 && "w-2/3")}
        />
      ))}
    </SkeletonRegion>
  ),
);
SkeletonText.displayName = "SkeletonText";

/** Card-shaped placeholder: image band, title, and body lines. */
const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonRegionProps>(
  ({ label, className, ...props }, ref) => (
    <SkeletonRegion
      ref={ref}
      label={label}
      className={cn(
        "space-y-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-5 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </SkeletonRegion>
  ),
);
SkeletonCard.displayName = "SkeletonCard";

interface SkeletonListProps extends SkeletonRegionProps {
  /** Number of rows to render. */
  count?: number;
  /** Render a leading avatar shape on each row. */
  avatar?: boolean;
}

/** Vertical list of rows, each an optional avatar + two text lines. */
const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ count = 3, avatar = true, label, className, ...props }, ref) => (
    <SkeletonRegion
      ref={ref}
      label={label}
      className={cn("space-y-4", className)}
      {...props}
    >
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {avatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  ),
);
SkeletonList.displayName = "SkeletonList";

interface SkeletonStatProps extends SkeletonRegionProps {
  /** Number of stat tiles to render. */
  count?: number;
}

/** Grid of stat/metric tiles (label + value placeholder). */
const SkeletonStat = React.forwardRef<HTMLDivElement, SkeletonStatProps>(
  ({ count = 3, label, className, ...props }, ref) => (
    <SkeletonRegion
      ref={ref}
      label={label}
      className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3", className)}
      {...props}
    >
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div
          key={i}
          className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground"
        >
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      ))}
    </SkeletonRegion>
  ),
);
SkeletonStat.displayName = "SkeletonStat";

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonStat,
};
export type {
  SkeletonRegionProps,
  SkeletonAvatarProps,
  SkeletonTextProps,
  SkeletonListProps,
  SkeletonStatProps,
};
