// Defensive readers for freeform CMS block JSON (T41). Block content is authored
// in Django Admin, so renderers must tolerate missing/wrong-typed fields.

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Slugifies a heading into a stable anchor id (T45). Used to link a guide's
 * table of contents to its rich-text section headings. Deterministic so the
 * TOC and the rendered heading derive the same id from the same text.
 */
export function headingSlug(value: unknown): string {
  return asString(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function asFaqItems(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = (item ?? {}) as Record<string, unknown>;
    return {
      question: asString(record.question),
      answer: asString(record.answer),
    };
  });
}
