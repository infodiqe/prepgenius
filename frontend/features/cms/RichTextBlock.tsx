import * as React from "react";
import { asString } from "./blockContent";

export function RichTextBlock({ content }: { content: Record<string, unknown> }) {
  const heading = asString(content.heading);
  // NOTE: `html` is admin-authored (Django Admin, trusted role). It is rendered
  // as-is; see the T41 "Risks" note on adding sanitization before opening
  // authoring to less-trusted roles.
  const html = asString(content.html);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {heading}
          </h2>
        )}
        {html && (
          <div
            className="prose prose-neutral mt-4 max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </section>
  );
}
