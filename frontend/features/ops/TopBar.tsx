"use client";

import React, { useState } from "react";
import { Bell, Command, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * Ops Platform TopBar — OPS-01A / OPS-STAB-01.
 *
 * Banner chrome: brand · global-command trigger (opens the command palette) ·
 * notification trigger (opens the drawer) · theme switcher · user menu.
 *
 * Identity and Sign out are wired to the authenticated session via `useAuth`
 * (no fake operator, no duplicate auth logic). There is no Ops-specific profile
 * route, so the menu intentionally has no Profile item rather than a dead
 * control. The Operations Platform UI is English-only.
 */

/** Initials from a full name (max two letters); falls back to an email letter. */
function deriveInitials(fullName?: string | null, email?: string | null): string {
  const name = fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0]);
    if (letters.length > 0) return letters.join("").toUpperCase();
  }
  const e = email?.trim();
  if (e) return e[0]!.toUpperCase();
  return "";
}

export default function TopBar({
  onOpenSearch,
  onOpenNotifications,
  onOpenMobileNav,
  /** Unread notification count; 0 (default) shows no badge. */
  unreadCount = 0,
}: {
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  /** Opens the mobile navigation drawer (rendered as a hamburger below md). */
  onOpenMobileNav?: () => void;
  unreadCount?: number;
}) {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  const fullName = user?.full_name?.trim() || "";
  const email = user?.email?.trim() || "";
  const initials = deriveInitials(fullName, email);

  // Placeholder theme switch: toggles the `dark` class on <html>. No persistence
  // (real theming wiring is out of scope for the shell skeleton).
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
      }
      return next;
    });
  };

  const hasUnread = unreadCount > 0;

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card/50 px-4 backdrop-blur-xl md:px-6">
      {/* Mobile nav trigger + brand — desktop brand lives in the Sidebar */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <span className="text-base font-bold text-foreground">
          PrepGenius Ops
        </span>
      </div>

      {/* Command palette trigger */}
      <div className="flex flex-1 items-center justify-center px-2 md:justify-start md:px-6">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Commands"
          className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Commands</span>
          <span className="ml-auto hidden items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs sm:flex">
            <Command className="h-3 w-3" aria-hidden="true" />K
          </span>
        </button>
      </div>

      {/* Action cluster */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme switcher */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="text-muted-foreground hover:text-foreground"
        >
          {isDark ? (
            <Sun className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>

        {/* Notification trigger */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenNotifications}
          aria-label={
            hasUnread
              ? `Notifications, ${unreadCount} unread`
              : "Notifications, no unread"
          }
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"
            />
          )}
        </Button>

        {/* User menu — real identity + working sign out */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-9 w-9 border border-border bg-muted">
                <AvatarFallback className="bg-muted text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
            {(fullName || email) && (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    {fullName && (
                      <p className="text-sm font-semibold text-foreground">
                        {fullName}
                      </p>
                    )}
                    {email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => void logout()}
              className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
