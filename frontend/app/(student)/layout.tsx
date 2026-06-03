'use client';

/**
 * Student layout — conditionally renders the app navigation shell.
 *
 * ─── Route Detection Strategy ─────────────────────────────────────────────────
 *
 *   The mock player at /practice/[attemptId] renders its own full-viewport
 *   chrome (ExamTopBar, action bar). The standard app shell (Sidebar, TopBar,
 *   BottomTabBar) must be completely hidden to prevent layout conflicts and
 *   double scroll containers.
 *
 *   Detection: usePathname() returns the current pathname client-side.
 *   A route is a player route when:
 *     pathname.startsWith('/practice/') && pathname !== '/practice'
 *
 *   This correctly identifies /practice/{uuid} while excluding the practice
 *   hub listing page (/practice) itself.
 *
 * ─── Shell Bypass Strategy ────────────────────────────────────────────────────
 *
 *   When isPlayerRoute === true:
 *     - Return children directly, wrapped in a full-viewport container.
 *     - Sidebar, TopBar, and BottomTabBar are NOT rendered (not hidden with CSS;
 *       not in the DOM at all). This avoids any z-index, scroll, or focus-trap
 *       conflicts between app chrome and the player's own chrome.
 *     - The outer <div> provides full-screen dimensions for the player to fill.
 *
 *   When isPlayerRoute === false:
 *     - Render the standard navigation shell unchanged.
 *
 * ─── Why 'use client' ────────────────────────────────────────────────────────
 *
 *   usePathname() is a client-side hook. Converting this layout to a Client
 *   Component is safe in Next.js App Router: children (page.tsx RSC) are passed
 *   as a slot prop and remain server-rendered regardless of the layout's
 *   client/server boundary.
 */

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/features/nav/Sidebar';
import TopBar from '@/features/nav/TopBar';
import BottomTabBar from '@/features/nav/BottomTabBar';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Player route: /practice/{attemptId} (any non-empty segment after /practice/)
  const isPlayerRoute =
    pathname.startsWith('/practice/') && pathname !== '/practice';

  if (isPlayerRoute) {
    // Player renders its own full-viewport shell — no app chrome at all.
    return (
      <div className="h-screen w-screen overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Collapsible desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <TopBar />

        {/* Dynamic page contents */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 pb-24 md:pb-6 bg-slate-950 relative">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <BottomTabBar />
      </div>
    </div>
  );
}
