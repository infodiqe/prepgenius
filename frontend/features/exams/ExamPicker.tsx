"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";

import {
  FormField,
  Label,
  Skeleton,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import { cn } from "@/lib/utils";

/*
 * ExamPicker — reusable exam selector (Sprint 1 · T10).
 *
 * Extracted from the T09 onboarding wizard so onboarding, profile, practice and
 * any future surface can reuse one accessible, token-compliant control. It is
 * presentation-only and fully controlled (`value` / `onChange`), so it works
 * with or without react-hook-form (onboarding bridges it via a Controller). All
 * copy (label, placeholder, empty-state text) is injected by the consumer to
 * keep it locale-agnostic.
 *
 * Behaviour:
 *  - shows active exams only (`is_active !== false`);
 *  - `loading` → T03 skeleton placeholder;
 *  - no active exams → T04 empty state;
 *  - otherwise a labelled native <select> wired for a11y via the T05b FormField
 *    (label association, aria-invalid, aria-describedby, inline error).
 */

export interface ExamPickerOption {
  id: string;
  name: string;
  code: string;
  /** Optional; when explicitly `false` the exam is hidden. */
  is_active?: boolean;
}

export interface ExamPickerProps {
  exams: ExamPickerOption[];
  value: string;
  onChange: (value: string) => void;
  /** Field id; seeds the description/error element ids. */
  id?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: React.ReactNode;
  /** Render a skeleton placeholder instead of the control. */
  loading?: boolean;
  /** Screen-reader label announced while loading. */
  loadingLabel?: string;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  /** Called when the control loses focus (e.g. RHF Controller onBlur). */
  onBlur?: () => void;
  className?: string;
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function ExamPicker({
  exams,
  value,
  onChange,
  id = "exam",
  label,
  description,
  placeholder,
  required,
  disabled,
  error,
  loading,
  loadingLabel = "Loading…",
  emptyTitle,
  emptyDescription,
  onBlur,
  className,
}: ExamPickerProps) {
  const activeExams = React.useMemo(
    () => exams.filter((exam) => exam.is_active !== false),
    [exams],
  );

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

  // No active exams to choose from (T04).
  if (activeExams.length === 0) {
    return (
      <EmptyState className={cn("py-8", className)}>
        <EmptyStateIcon>
          <BookOpen />
        </EmptyStateIcon>
        {emptyTitle && <EmptyStateTitle as="h3">{emptyTitle}</EmptyStateTitle>}
        {emptyDescription && (
          <EmptyStateDescription>{emptyDescription}</EmptyStateDescription>
        )}
      </EmptyState>
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
        <select
          {...field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(
            SELECT_CLASS,
            error && "border-destructive focus-visible:ring-destructive",
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {activeExams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} ({exam.code})
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}
