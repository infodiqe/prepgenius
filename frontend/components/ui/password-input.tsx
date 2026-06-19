"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";

/*
 * PasswordInput — shared form primitive (Sprint 1 · T05b).
 *
 * An Input with an integrated show/hide visibility toggle. Presentation only:
 * no validation, no auth-specific copy. Forwards its ref + all input props to
 * the underlying Input so it drops into react-hook-form (`{...register(name)}`)
 * unchanged. Toggle labels are injected by the consumer for localization, with
 * neutral English fallbacks.
 */

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /** aria-label for the toggle while the password is hidden. */
  showAriaLabel?: string;
  /** aria-label for the toggle while the password is visible. */
  hideAriaLabel?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showAriaLabel = "Show password",
      hideAriaLabel = "Hide password",
      disabled,
      ...props
    },
    ref,
  ) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? hideAriaLabel : showAriaLabel}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
