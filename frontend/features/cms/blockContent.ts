// Defensive readers for freeform CMS block JSON (T41). Block content is authored
// in Django Admin, so renderers must tolerate missing/wrong-typed fields.

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
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
