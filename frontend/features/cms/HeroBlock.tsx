import * as React from "react";
import { asString } from "./blockContent";

export function HeroBlock({ content }: { content: Record<string, unknown> }) {
  const title = asString(content.title);
  const subtitle = asString(content.subtitle);
  const ctaLabel = asString(content.cta_label);
  const ctaHref = asString(content.cta_href);

  return (
    <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        {title && (
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {subtitle}
          </p>
        )}
        {ctaLabel && ctaHref && (
          <div className="mt-8">
            <a
              href={ctaHref}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
