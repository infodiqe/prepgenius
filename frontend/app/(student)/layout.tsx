import React from "react";
import Sidebar from "@/features/nav/Sidebar";
import TopBar from "@/features/nav/TopBar";
import BottomTabBar from "@/features/nav/BottomTabBar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
