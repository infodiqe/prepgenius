import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Checkbox — shared form primitive (Sprint 1 · T06).
 *
 * A native, token-styled checkbox. Presentation only: no validation and no
 * feature-specific copy. Forwards its ref + all input props to the underlying
 * <input> so it drops into react-hook-form (`{...register(name)}`) unchanged —
 * RHF binds the field to the element's `checked` boolean automatically. The
 * accessible name comes from a wiring `<label htmlFor>` provided by the
 * consumer; aria-invalid / aria-describedby are passed through for error wiring.
 */

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border border-input accent-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
