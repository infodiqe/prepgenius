"use client";

import React from "react";
import { Inbox, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyPracticeStateProps {
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  variant?: "info" | "warning";
}

export default function EmptyPracticeState({
  title,
  description,
  ctaText,
  onCtaClick,
  variant = "info",
}: EmptyPracticeStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border bg-card rounded-2xl max-w-md mx-auto"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full p-4 bg-muted mb-4 text-muted-foreground border border-border">
        {variant === "warning" ? (
          <AlertCircle className="h-8 w-8 text-amber-500" aria-hidden="true" />
        ) : (
          <Inbox className="h-8 w-8 text-indigo-400" aria-hidden="true" />
        )}
      </div>
      <h3 className="text-lg font-bold text-foreground tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        {description}
      </p>
      {ctaText && onCtaClick && (
        <Button
          onClick={onCtaClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-primary-foreground font-semibold px-5 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
        >
          {ctaText}
        </Button>
      )}
    </div>
  );
}
