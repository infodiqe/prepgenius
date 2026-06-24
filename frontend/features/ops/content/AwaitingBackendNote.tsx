import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AwaitingBackendNote — OPS-02.
 *
 * Inline marker shown beside controls the current backend cannot serve
 * (text/ID search, subject/topic filtering, pagination). Per the OPS-02
 * strict-API-only decision these controls are rendered DISABLED rather than
 * emulated client-side; this note explains why. English-only.
 */
export function AwaitingBackendNote({
  children = "Awaiting backend support",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
