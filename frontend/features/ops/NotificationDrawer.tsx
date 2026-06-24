"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BellOff, X } from "lucide-react";

/**
 * NotificationDrawer — OPS-01A / OPS-STAB-01.
 *
 * Right-anchored internal notification center. There is no notification source
 * wired yet, so the drawer renders an honest empty state rather than mock cards
 * or a fake unread badge (no mock data, no misleading indicators). The four
 * routed categories (Assignments, System, Commerce, Mentions) from the UX
 * architecture §10 will populate this surface when a backend stream exists.
 *
 * Controlled by the shell through `open` / `onOpenChange`. Radix provides focus
 * trap/restore, Escape-to-close and `aria-modal`. English-only.
 */
export function NotificationDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Notifications"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                Notifications
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                Assignments, alerts and mentions
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close notifications"
              className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Empty state — no notification source wired yet */}
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellOff className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">
              You&rsquo;re all caught up
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              There are no notifications yet. Assignments, system alerts and
              mentions will appear here.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
