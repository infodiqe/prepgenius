"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, BookOpen, BarChart3, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navItems = [
    { href: "/dashboard", label: t("home"), icon: Home },
    { href: "/practice", label: t("practice"), icon: BookOpen },
    { href: "/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/tutor", label: t("tutor"), icon: Bot },
    { href: "/profile", label: t("profile"), icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-slate-800 bg-slate-950/80 backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex h-12 w-16 flex-col items-center justify-center rounded-lg text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                isActive ? "text-blue-500 font-semibold" : "hover:text-slate-200"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="mt-1 text-[10px] tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
