import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Breadcrumb {
  label: string;
  /** Optional link target; the last crumb is typically static. */
  href?: string;
}

/**
 * WorkspaceHeader — OPS-01A.
 *
 * Reusable page header for every Ops workspace: breadcrumbs, title, optional
 * subtitle, a primary action slot, and a secondary actions slot. Purely
 * presentational (no hooks, no data) so it composes inside any workspace.
 */
export function WorkspaceHeader({
  title,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-b border-border bg-background px-4 py-4 md:px-8",
        className,
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="rounded hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(isLast && "font-medium text-foreground")}
                      aria-current={isLast ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronRight
                      className="h-3 w-3 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-foreground md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </div>
  );
}
