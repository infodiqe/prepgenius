"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Avatar,
  AvatarFallback,
  Button,
} from "@/components/ui";
import { Globe, LogOut, User, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { WorkspaceSwitcher } from "@/features/workspace/WorkspaceSwitcher";

export default function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  const tLang = useTranslations("language");
  const tWorkspace = useTranslations("workspace");

  const handleLanguageChange = (newLocale: "as" | "en" | "hi") => {
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return "U";
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-xl">
      {/* Page Title Context / Breadcrumb Placeholder */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground md:block hidden">
          PrepGenius AI Platform
        </h1>
        {/* Mobile brand text */}
        <span className="text-lg font-bold text-foreground md:hidden block">
          PrepGenius
        </span>
      </div>

      {/* Action Menus */}
      <div className="flex items-center gap-2">
        {/* Workspace switcher (renders only for multi-workspace users) — desktop */}
        <div className="hidden md:flex items-center">
          <WorkspaceSwitcher />
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Language Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={tLang("language_selector")}
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs uppercase font-semibold md:block hidden">{tLang("label")}</span>
              <ChevronDown className="h-3 w-3 opacity-55" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-border bg-popover">
            <DropdownMenuItem
              onClick={() => handleLanguageChange("as")}
              className="cursor-pointer text-sm"
            >
              অসমীয়া (Assamese)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("en")}
              className="cursor-pointer text-sm"
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("hi")}
              className="cursor-pointer text-sm"
            >
              हिंदी (Hindi)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring p-0.5"
              aria-label={tNav("profile_menu")}
            >
              <Avatar className="h-9 w-9 border border-border bg-muted">
                <AvatarFallback className="bg-muted text-foreground">
                  {user ? getInitials(user.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 border-border bg-popover" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {user?.full_name || tWorkspace("student")}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="cursor-pointer flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span>{tNav("profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>{t("logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
