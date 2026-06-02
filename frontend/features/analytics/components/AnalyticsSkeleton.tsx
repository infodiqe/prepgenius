import React from "react";

export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse pb-12">
      {/* KPI Grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-900 border border-slate-800/60 rounded-lg p-6 flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-slate-800 rounded" />
              <div className="h-6 w-20 bg-slate-800 rounded" />
              <div className="h-3 w-24 bg-slate-800 rounded" />
            </div>
            <div className="h-10 w-10 bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Chart skeleton */}
        <div className="h-80 bg-slate-900 border border-slate-800/60 rounded-lg p-6 space-y-4">
          <div className="h-4 w-36 bg-slate-800 rounded" />
          <div className="h-3 w-56 bg-slate-800 rounded" />
          <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Topic Table skeleton */}
        <div className="h-80 bg-slate-900 border border-slate-800/60 rounded-lg p-6 space-y-4">
          <div className="h-4 w-36 bg-slate-800 rounded" />
          <div className="h-3 w-56 bg-slate-800 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-850">
                <div className="h-3 w-32 bg-slate-800 rounded" />
                <div className="h-3 w-12 bg-slate-800 rounded" />
                <div className="h-3 w-12 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
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
              <div className="h-8 w-full bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
