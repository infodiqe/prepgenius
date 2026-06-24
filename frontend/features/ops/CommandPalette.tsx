"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";

interface NavCommand {
  id: string;
  label: string;
  href: string;
}

/**
 * Navigation commands — OPS-STAB-01. NAVIGATION MODE ONLY: each command routes to
 * an existing, built Ops workspace. No mutations, no workflow actions, no backend
 * search (those are deliberately out of scope until a real search source exists).
 * Targets mirror the live routes in `opsNav.ts`. Ops UI is English-only.
 */
const NAV_COMMANDS: readonly NavCommand[] = [
  { id: "go-overview", label: "Go to Overview", href: "/ops" },
  { id: "go-content", label: "Go to Content Studio", href: "/ops/content" },
  { id: "go-review", label: "Go to Review Queue", href: "/ops/review" },
  { id: "go-cms", label: "Go to CMS Studio", href: "/ops/cms" },
  { id: "go-exams", label: "Go to Exams", href: "/ops/exams" },
  { id: "go-analytics", label: "Go to Analytics", href: "/ops/analytics" },
  { id: "go-users", label: "Go to Users", href: "/ops/users" },
  { id: "go-billing", label: "Go to Billing", href: "/ops/billing" },
];

/**
 * CommandPalette — OPS-STAB-01 (navigation mode).
 *
 * Centered modal with a searchable, keyboard-operable list of navigation
 * commands. Opens on Cmd/Ctrl+K (global) and via the TopBar trigger. Arrow keys
 * move the active option, Enter navigates, Escape closes (Radix). Controlled by
 * the shell through `open` / `onOpenChange`.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Global Cmd/Ctrl+K toggles the palette.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Reset the query + active option whenever the palette closes.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === ""
      ? NAV_COMMANDS
      : NAV_COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  // Keep the active index in range as the filtered list changes.
  useEffect(() => {
    setActiveIndex((i) => (i >= matches.length ? 0 : i));
  }, [matches.length]);

  const navigate = useCallback(
    (command: NavCommand | undefined) => {
      if (!command) return;
      onOpenChange(false);
      router.push(command.href);
    },
    [onOpenChange, router],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigate(matches[activeIndex]);
    }
  };

  const activeId = matches[activeIndex]?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 max-w-xl translate-y-0 gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>
            Search and navigate to a workspace. Use arrow keys to move and Enter
            to go.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            aria-label="Commands"
            aria-controls="ops-command-list"
            aria-activedescendant={activeId}
            placeholder="Go to…"
            autoComplete="off"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching commands
            </p>
          ) : (
            <>
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Navigation
              </p>
              <ul
                ref={listRef}
                id="ops-command-list"
                role="listbox"
                aria-label="Navigation commands"
              >
                {matches.map((cmd, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <li key={cmd.id} role="presentation">
                      <button
                        type="button"
                        id={cmd.id}
                        role="option"
                        aria-selected={isActive ? "true" : "false"}
                        onClick={() => navigate(cmd)}
                        onMouseMove={() => setActiveIndex(i)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive ? "bg-muted" : "hover:bg-muted",
                        )}
                      >
                        <span>{cmd.label}</span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
                            Enter
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
