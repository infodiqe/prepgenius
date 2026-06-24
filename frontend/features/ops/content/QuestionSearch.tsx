import React from "react";
import { Search } from "lucide-react";
import { Input, Label } from "@/components/ui";
import { AwaitingBackendNote } from "./AwaitingBackendNote";

/**
 * QuestionSearch — OPS-02 (Section C).
 *
 * Question-ID and free-text search. The list API exposes NO search parameter,
 * and the OPS-02 decision forbids client-side indexing/search. The inputs are
 * therefore rendered DISABLED with an "Awaiting backend support" note instead of
 * being emulated client-side. English-only.
 */
export function QuestionSearch() {
  return (
    <section aria-label="Search questions" className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="content-search-id" className="text-xs">
            Question ID
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="content-search-id"
              type="search"
              disabled
              placeholder="Search by question ID"
              aria-describedby="content-search-note"
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="content-search-text" className="text-xs">
            Text
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="content-search-text"
              type="search"
              disabled
              placeholder="Search question text"
              aria-describedby="content-search-note"
              className="pl-8"
            />
          </div>
        </div>
      </div>
      <AwaitingBackendNote className="ml-0.5" >
        <span id="content-search-note">
          Search is awaiting backend support (server-side search only).
        </span>
      </AwaitingBackendNote>
    </section>
  );
}
