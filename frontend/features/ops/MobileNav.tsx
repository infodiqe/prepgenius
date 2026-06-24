"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { visibleOpsNavForPersonas, type OpsPersona } from "./opsNav";
import { OpsNavItems } from "./OpsNavItems";

/**
 * Ops Platform MobileNav — OPS-HARDEN-02 Part D.
 *
 * Left-anchored navigation drawer for small screens (the desktop `Sidebar` is
 * `hidden md:flex`). Reuses the exact same nav config and item renderer as the
 * sidebar (`visibleOpsNavForPersonas` + `OpsNavItems`) — one IA, no duplicate
 * nav definitions, no separate mobile information architecture, no bottom nav.
 *
 * Radix Dialog provides the accessibility backbone: focus trap, focus restore on
 * close, `aria-modal`, and Escape-to-close. The drawer also **closes on
 * navigation** — every live link calls `onNavigate` → `onOpenChange(false)`.
 * Controlled by the shell via `open` / `onOpenChange`; the trigger lives in the
 * TopBar (mobile only).
 */
export function MobileNav({
  open,
  onOpenChange,
  personas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personas: readonly OpsPersona[];
}) {
  const pathname = usePathname();
  const items = visibleOpsNavForPersonas(personas);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
        <DialogPrimitive.Content
          aria-label="Operations navigation"
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm text-primary-foreground">
                PG
              </div>
              <DialogPrimitive.Title className="text-base tracking-tight">
                PrepGenius Ops
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Description className="sr-only">
              Operations Platform navigation
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              aria-label="Close navigation"
              className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Nav list (same config + renderer as the desktop sidebar) */}
          <nav
            aria-label="Operations navigation"
            className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
          >
            <OpsNavItems
              items={items}
              pathname={pathname}
              onNavigate={() => onOpenChange(false)}
            />
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
