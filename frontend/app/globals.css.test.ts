import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Read the token baseline directly (no UI/page — scope is CSS variables only).
const css = readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf8");

function block(selector: string): string {
  // Extract the first `{ ... }` body for a given selector (`:root` / `.dark`).
  const re = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  if (!m) throw new Error(`block not found: ${selector}`);
  return m[1];
}

function token(body: string, name: string): string {
  const m = body.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`token not found: --${name}`);
  return m[1].trim();
}

// ── WCAG contrast helpers (HSL "h s% l%" → ratio) ─────────────────────────────
function hslToRgb(hsl: string): [number, number, number] {
  const [h, s, l] = hsl
    .replace(/%/g, "")
    .split(/\s+/)
    .map(Number)
    .map((n, i) => (i === 0 ? n : n / 100));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
}

function relativeLuminance(hsl: string): number {
  const lin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const [r, g, b] = hslToRgb(hsl).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const root = block(":root");
const dark = block(".dark");

describe("approved palette tokens (:root, light default)", () => {
  it("sets Indigo / Sky / Amber and core tokens", () => {
    expect(token(root, "primary")).toBe("243 75% 59%"); // Indigo
    expect(token(root, "secondary")).toBe("199 89% 48%"); // Sky
    expect(token(root, "accent")).toBe("38 92% 50%"); // Amber
    expect(token(root, "success")).toBe("158 64% 40%");
    expect(token(root, "destructive")).toBe("350 78% 50%");
    expect(token(root, "background")).toBe("0 0% 100%");
    expect(token(root, "radius")).toBe("0.625rem");
  });

  it("uses primary as the ring color", () => {
    expect(token(root, "ring")).toBe(token(root, "primary"));
  });
});

describe("WCAG contrast (foreground ≥ 4.5:1)", () => {
  it("primary-foreground on primary passes AA", () => {
    expect(
      contrast(token(root, "primary-foreground"), token(root, "primary")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("accent-foreground on accent passes AA", () => {
    expect(
      contrast(token(root, "accent-foreground"), token(root, "accent")),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe(".dark block", () => {
  it("exists and keeps the same brand hues", () => {
    expect(token(dark, "primary")).toBe("243 75% 59%");
    expect(token(dark, "secondary")).toBe("199 89% 48%");
    expect(token(dark, "accent")).toBe("38 92% 50%");
  });

  it("uses a dark background (distinct from the light default)", () => {
    expect(token(dark, "background")).not.toBe(token(root, "background"));
  });
});
