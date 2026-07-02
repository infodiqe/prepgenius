"use client";

import React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export default function PracticeSkeleton() {
  return (
    <div className="space-y-8 p-1" aria-hidden="true">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Exam Selector Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>

      {/* Active Attempt Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="p-6 border border-border bg-card rounded-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2 w-full md:w-auto">
              <Skeleton className="h-4 w-28" />
              <div className="h-3" />
              <Skeleton className="h-6 w-56" />
              <div className="h-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-full md:w-36 shrink-0" />
          </div>
        </div>
      </div>

      {/* Tabs Layout Skeleton */}
      <div className="space-y-6">
        <div className="border-b border-border pb-px flex gap-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-t-md rounded-b-none" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 border border-border bg-card rounded-xl flex items-center justify-between gap-4">
              <div className="space-y-2 w-full">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-10 w-24 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
