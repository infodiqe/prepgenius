"use client";

import * as React from "react";

import { FormField, Label, Input, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

/*
 * ExamDatePicker — reusable exam-date selector (Sprint 1 · T11).
 *
 * Extracted from the T09 onboarding wizard alongside the T10 ExamPicker so
 * onboarding, profile and any future surface reuse one accessible,
 * token-compliant date control. It is presentation-only and fully controlled
 * (`value` / `onChange`), so it works with or without react-hook-form
 * (onboarding bridges it via a Controller). All copy (label, description) is
 * injected by the consumer to keep it locale-agnostic.
 *
 * Validation is presentation-only: `minDate` / `maxDate` are passed straight to
 * the native input's `min` / `max` attributes as UX hints. The component owns NO
 * business rules — the consumer's schema (e.g. onboarding's "not in the past")
 * remains the source of truth. (No empty-state: a date field has no "no data"
 * concept, so T04 is not applicable here.)
 */

export interface ExamDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Field id; seeds the description/error element ids. */
  id?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  error?: React.ReactNode;
  /** Earliest selectable date (`YYYY-MM-DD`) — presentation hint only. */
  minDate?: string;
  /** Latest selectable date (`YYYY-MM-DD`) — presentation hint only. */
  maxDate?: string;
  /** Render a skeleton placeholder instead of the control. */
  loading?: boolean;
  /** Screen-reader label announced while loading. */
  loadingLabel?: string;
  /** Called when the control loses focus (e.g. RHF Controller onBlur). */
  onBlur?: () => void;
  className?: string;
}

export function ExamDatePicker({
  value,
  onChange,
  id = "exam_date",
  label,
  description,
  required,
  disabled,
  error,
  minDate,
  maxDate,
  loading,
  loadingLabel = "Loading…",
  onBlur,
  className,
}: ExamDatePickerProps) {
  // Loading — keep the label visible and announce the busy region (T03).
  if (loading) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>
        <div role="status" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <FormField
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      {(field) => (
        <Input
          type="date"
          min={minDate}
          max={maxDate}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
          {...field}
        />
      )}
    </FormField>
  );
}
