"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight, dependency-free accordion. We avoid pulling in
// @radix-ui/react-accordion (not currently installed) to keep the bundle lean
// for low-end Android (PRD v4 §4) and avoid an out-of-scope dependency bump.

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("divide-y divide-border", className)} {...props} />
));
Accordion.displayName = "Accordion";

export interface AccordionItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  question: React.ReactNode;
  answer: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ question, answer, defaultOpen = false, className, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen);
    const contentId = React.useId();
    const triggerId = React.useId();

    return (
      <div ref={ref} className={cn("py-1", className)} {...props}>
        <h3 className="m-0">
          <button
            type="button"
            id={triggerId}
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>{question}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </h3>
        {open && (
          <div
            id={contentId}
            role="region"
            aria-labelledby={triggerId}
            className="pb-4 pr-9 text-sm leading-relaxed text-muted-foreground"
          >
            {answer}
          </div>
        )}
      </div>
    );
  },
);
AccordionItem.displayName = "AccordionItem";

export { Accordion, AccordionItem };
