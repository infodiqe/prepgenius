import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Button, type ButtonProps } from "./button";

/*
 * Shared form primitives — Sprint 1 · T05b.
 *
 * Presentation-only building blocks extracted from the T05a registration form
 * so login, registration, profile and onboarding can reuse them. They carry no
 * business logic, no validation, and no feature-specific copy — all text is
 * passed in by the consumer (localized upstream). They are react-hook-form
 * friendly: `FormField` computes the id / aria wiring and hands it to the
 * control via a render prop, so the consumer just spreads `{...register(name)}`.
 */

/* ------------------------------------------------------------------ FieldError */

export interface FieldErrorProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  /** The error message; when empty/undefined nothing renders. */
  children?: React.ReactNode;
}

/** Inline, assertive error message tied to a field via its `id`. */
const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;
    return (
      <p
        ref={ref}
        role="alert"
        className={cn("text-sm font-medium text-destructive", className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);
FieldError.displayName = "FieldError";

/* ------------------------------------------------------------------- FormField */

/** Accessibility props `FormField` injects into the control it wraps. */
export interface FormFieldControlProps {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  "aria-required"?: true;
}

export interface FormFieldProps {
  /** Unique field id; also seeds the description/error element ids. */
  id: string;
  /** Visible label text. */
  label: React.ReactNode;
  /** Optional helper/description text rendered under the label. */
  description?: React.ReactNode;
  /** Error message (e.g. `errors.email?.message`); toggles invalid styling. */
  error?: React.ReactNode;
  /** Marks the field visually + via aria as required. */
  required?: boolean;
  className?: string;
  /** Render prop receiving the id + aria wiring to spread onto the control. */
  children: (control: FormFieldControlProps) => React.ReactNode;
}

/**
 * Wraps a single labelled control: Label + control + {@link FieldError},
 * wiring `htmlFor`/`id`, `aria-invalid`, and `aria-describedby` automatically.
 */
function FormField({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

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
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        ...(required ? { "aria-required": true as const } : {}),
      })}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/* ----------------------------------------------------------------- FormSection */

export interface FormSectionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional group title; when present the section becomes a labelled group. */
  title?: React.ReactNode;
  /** Optional supporting copy under the title. */
  description?: React.ReactNode;
}

/**
 * Groups related fields. With a `title` it becomes an accessible
 * `role="group"` labelled by the title; without one it's a plain layout
 * container. Heading is a styled element (not a real heading) to avoid
 * polluting the page outline.
 */
const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ title, description, className, children, ...props }, ref) => {
    const titleId = React.useId();
    if (!title) {
      return (
        <div ref={ref} className={cn("space-y-4", className)} {...props}>
          {children}
        </div>
      );
    }
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        className={cn("space-y-4", className)}
        {...props}
      >
        <div className="space-y-1">
          <div id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    );
  },
);
FormSection.displayName = "FormSection";

/* ---------------------------------------------------------------- SubmitButton */

export interface SubmitButtonProps extends ButtonProps {
  /** Shows the spinner, disables interaction, and sets `aria-busy`. */
  isLoading?: boolean;
  /** Label shown while loading; falls back to `children`. */
  loadingText?: React.ReactNode;
}

/** A `type="submit"` button with a built-in loading/spinner state. */
const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  (
    { isLoading, loadingText, children, disabled, className, ...props },
    ref,
  ) => (
    <Button
      ref={ref}
      type="submit"
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn("w-full", className)}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            aria-hidden="true"
          />
          {loadingText ?? children}
        </span>
      ) : (
        children
      )}
    </Button>
  ),
);
SubmitButton.displayName = "SubmitButton";

export { FieldError, FormField, FormSection, SubmitButton };
