import React from "react";

export default function ResultSkeleton() {
  return (
    <div className="space-y-8 animate-pulse pb-12">
      {/* Hero card skeleton */}
      <div className="h-44 bg-card border border-border rounded-2xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 bg-muted rounded-full" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-6 pt-6 md:pt-0">
          <div className="space-y-2">
            <div className="h-3 w-12 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
          <div className="h-10 w-px bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-12 bg-muted rounded" />
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-card border border-border rounded-lg p-6 flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-6 w-20 bg-muted rounded" />
            </div>
            <div className="h-10 w-10 bg-muted rounded-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section breakdown skeleton */}
        <div className="lg:col-span-1 h-80 bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
          <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-3 w-12 bg-muted rounded" />
                </div>
                <div className="h-3 w-full bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Accordions skeleton */}
        <div className="lg:col-span-2 space-y-3">
          <div className="h-6 w-36 bg-muted rounded mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-lg p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-6 w-8 bg-muted rounded" />
                <div className="h-4 w-60 bg-muted rounded" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-16 bg-muted rounded-full" />
                <div className="h-4 w-4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
