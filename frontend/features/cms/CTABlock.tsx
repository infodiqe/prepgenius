import * as React from "react";
import { asString } from "./blockContent";

export function CTABlock({ content }: { content: Record<string, unknown> }) {
  const title = asString(content.title);
  const subtitle = asString(content.subtitle);
  const buttonLabel = asString(content.button_label);
  const buttonHref = asString(content.button_href);

  return (
    <section className="border-t border-border bg-accent/30 py-16">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        {title && (
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {subtitle}
          </p>
        )}
        {buttonLabel && buttonHref && (
          <div className="mt-8">
            <a
              href={buttonHref}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {buttonLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
