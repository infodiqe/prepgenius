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

export default function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");

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
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/20 px-6 backdrop-blur-xl">
      {/* Page Title Context / Breadcrumb Placeholder */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white md:block hidden">
          PrepGenius AI Platform
        </h1>
        {/* Mobile brand text */}
        <span className="text-lg font-bold text-white md:hidden block">
          PrepGenius
        </span>
      </div>

      {/* Action Menus */}
      <div className="flex items-center gap-4">
        {/* Language Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 focus:ring-2 focus:ring-blue-500"
              aria-label="Select Language"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs uppercase font-semibold md:block hidden">Language</span>
              <ChevronDown className="h-3 w-3 opacity-55" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-slate-800 bg-slate-950">
            <DropdownMenuItem
              onClick={() => handleLanguageChange("as")}
              className="cursor-pointer text-sm hover:bg-slate-800"
            >
              অসমীয়া (Assamese)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("en")}
              className="cursor-pointer text-sm hover:bg-slate-800"
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("hi")}
              className="cursor-pointer text-sm hover:bg-slate-800"
            >
              हिंदी (Hindi)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 p-0.5"
              aria-label="User profile menu"
            >
              <Avatar className="h-9 w-9 border border-slate-700">
                <AvatarFallback>
                  {user ? getInitials(user.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 border-slate-800 bg-slate-950" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-white">
                  {user?.full_name || "Student"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="cursor-pointer flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <User className="h-4 w-4" />
              <span>{tNav("profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
