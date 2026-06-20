import * as React from "react";
import type { CmsBlock } from "@/lib/cms/api";
import { HeroBlock } from "./HeroBlock";
import { RichTextBlock } from "./RichTextBlock";
import { FAQBlock } from "./FAQBlock";
import { CTABlock } from "./CTABlock";

/**
 * Renders a single CMS block by type (T41). Unknown block types are ignored
 * (render nothing) so a new backend type never crashes an existing page.
 */
export function BlockRenderer({ block }: { block: CmsBlock }) {
  const content = (block.content ?? {}) as Record<string, unknown>;

  switch (block.block_type) {
    case "hero":
      return <HeroBlock content={content} />;
    case "rich_text":
      return <RichTextBlock content={content} />;
    case "faq":
      return <FAQBlock content={content} />;
    case "cta":
      return <CTABlock content={content} />;
    default:
      return null;
  }
}
