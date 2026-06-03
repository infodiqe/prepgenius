'use client';

/**
 * Mock Player — QuestionStem
 *
 * Renders question text as plain text. No HTML, no markdown, no formatting.
 *
 * ─── Typography and Localization Strategy ────────────────────────────────────
 *
 *   PrepGenius is Assamese-first (PRD v4 §4.1). Question stems may contain:
 *     - Assamese text (Assamese dialect of Bengali script, Unicode U+0980-U+09FF)
 *     - Hindi text   (Devanagari script, Unicode U+0900-U+097F)
 *     - English text (Latin script)
 *     - Mixed: a single stem may span multiple scripts
 *
 *   Font cascade (applied via inline style):
 *     1. var(--font-sans)       → Inter (Latin glyphs)
 *     2. var(--font-bengali)    → Noto Sans Bengali (Assamese/Bengali script)
 *     3. var(--font-devanagari) → Noto Sans Devanagari (Hindi/Devanagari)
 *     4. sans-serif             → system fallback
 *
 *   The browser applies Unicode range matching: each character is rendered in
 *   the FIRST font in the stack that covers it. This handles mixed-script stems
 *   automatically without any language detection code.
 *
 *   Why inline style instead of a Tailwind utility:
 *     Tailwind's `font-sans`, `font-bengali`, and `font-devanagari` utilities
 *     each apply a single font family. The cascade across all three requires a
 *     custom font-family string that Tailwind cannot express as a single utility
 *     without extending the config (which is out of scope for Phase 4).
 *
 *   Typography requirements (architecture §14.5):
 *     - Minimum 1rem (16px) body; upgrades to text-lg on larger screens
 *     - Line height 1.625 (leading-relaxed) for readability in all scripts
 *     - Bengali-Assamese conjunct characters need 10–20% extra line height
 *       headroom — leading-relaxed provides this without additional tuning
 *
 * ─── Security ──────────────────────────────────────────────────────────────────
 *
 *   This component receives only `stem: string`. It renders it via {stem} in
 *   JSX (textContent), NEVER via dangerouslySetInnerHTML. Any HTML or script
 *   tags in the stem string are escaped automatically by React.
 */

interface QuestionStemProps {
  /** Plain text question content. May be Assamese, Hindi, or English. */
  stem: string;
}

/** CSS font-family cascade covering all three supported scripts. */
const MULTILINGUAL_FONT_STACK =
  'var(--font-sans), var(--font-bengali), var(--font-devanagari), sans-serif';

export function QuestionStem({ stem }: QuestionStemProps) {
  return (
    <p
      className="text-base md:text-lg leading-relaxed text-slate-800"
      style={{ fontFamily: MULTILINGUAL_FONT_STACK }}
    >
      {stem}
    </p>
  );
}
