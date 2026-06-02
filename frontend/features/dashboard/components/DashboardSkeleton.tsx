import React from "react";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Greeting and Countdown header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-800 rounded-md" />
          <div className="h-4 w-40 bg-slate-800 rounded-md" />
        </div>
        <div className="h-10 w-48 bg-slate-800 rounded-md" />
      </div>

      {/* Stats Grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-900 border border-slate-800/60 rounded-lg p-6 flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-slate-800 rounded" />
              <div className="h-6 w-20 bg-slate-800 rounded" />
              <div className="h-3 w-32 bg-slate-800 rounded" />
            </div>
            <div className="h-10 w-10 bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>

      {/* Daily Practice Card skeleton */}
      <div className="h-56 bg-slate-900 border border-slate-800/60 rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="h-6 w-60 bg-slate-800 rounded" />
        </div>
        <div className="h-4 w-full bg-slate-800 rounded" />
        <div className="h-10 w-full bg-slate-800 rounded" />
      </div>

      {/* Weak Topics skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-36 bg-slate-800 rounded" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 w-72 bg-slate-900 border border-slate-800/60 rounded-lg p-5 shrink-0 space-y-4">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-5 w-40 bg-slate-800 rounded" />
              <div className="h-4 w-28 bg-slate-800 rounded" />
              <div className="h-8 w-full bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
