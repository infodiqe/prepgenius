"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, BookOpen, BarChart3, Bot, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: Home },
    { href: "/practice", label: t("practice"), icon: BookOpen },
    { href: "/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/tutor", label: t("tutor"), icon: Bot },
    { href: "/profile", label: t("profile"), icon: User },
  ];

  return (
    <aside
      aria-label="Sidebar Navigation"
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-slate-800 bg-slate-900/40 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-sm">
            PG
          </div>
          {!collapsed && <span className="text-lg tracking-wider">PrepGenius</span>}
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex h-12 items-center gap-4 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle Button */}
      <div className="p-4 border-t border-slate-800 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 w-10 text-slate-400 hover:text-slate-200"
          aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  );
}
