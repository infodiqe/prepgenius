"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui";
import { useTheme } from "./ThemeProvider";

/**
 * Theme toggle button — Sprint 0 · S0-T06.
 *
 * Standalone control; it is intentionally NOT mounted into the navigation here
 * (placement in the TopBar is S0-T10, which owns navigation changes). Shows a
 * Sun in dark mode (switch to light) and a Moon in light mode (switch to dark).
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}
