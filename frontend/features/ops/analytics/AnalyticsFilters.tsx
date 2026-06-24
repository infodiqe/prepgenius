import React from "react";
import { Input, Label } from "@/components/ui";
import { AwaitingBackendNote } from "../content/AwaitingBackendNote";

/**
 * AnalyticsFilters — OPS-08A (Part F).
 *
 * The operator analytics endpoints are platform-wide and take no parameters, so
 * the only filter that remains is Date Range — which no endpoint supports yet.
 * Its inputs are rendered DISABLED with an honest "Awaiting backend support" note
 * (the sole truly-unsupported capability) rather than emulated client-side.
 * English-only; semantic tokens.
 */
export function AnalyticsFilters() {
  return (
    <section
      aria-label="Analytics filters"
      className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-3"
    >
      <div className="space-y-1">
        <Label htmlFor="analytics-date-from" className="text-xs">
          Date range
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="analytics-date-from"
            type="date"
            disabled
            aria-describedby="analytics-date-note"
            className="h-9 w-40"
          />
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <Input
            id="analytics-date-to"
            type="date"
            disabled
            aria-describedby="analytics-date-note"
            className="h-9 w-40"
          />
        </div>
        <AwaitingBackendNote className="mt-1">
          <span id="analytics-date-note">
            Date-range filtering is awaiting backend support.
          </span>
        </AwaitingBackendNote>
      </div>
    </section>
  );
}
