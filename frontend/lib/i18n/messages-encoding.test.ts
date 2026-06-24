// Encoding integrity tests for the i18n message catalogs (P0 mojibake regression).
//
// A UTF-8 -> Windows-1252 -> UTF-8 round-trip once corrupted every catalog, so
// "₹499" rendered as "â‚¹499" and Assamese/Hindi text became "à¦…"/"à¤…".
// These tests lock the fix in: the JSON files must be UTF-8 without BOM, free of
// the mojibake signatures, and must contain real script in the right Unicode
// blocks. They read the same files request.ts loads, so a bad re-save fails CI.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "./locale";

const MESSAGES_DIR = path.resolve(__dirname, "../../messages");

function rawBuffer(locale: string): Buffer {
  return readFileSync(path.join(MESSAGES_DIR, `${locale}.json`));
}

// Substrings that only appear when UTF-8 bytes were decoded as Windows-1252 /
// Latin-1 and re-encoded. If any show up, the file was mangled again.
const MOJIBAKE_SIGNATURES = [
  "â‚¹", // ₹  (U+20B9)
  "à¦", // Assamese/Bengali block lead byte
  "à¤", // Devanagari block lead byte
  "â€", // smart quotes / dashes
  "Ã", // generic Latin-1 double-encode marker
  "Â", // stray no-break-space double-encode marker
  "�", // replacement char from a failed decode
];

// Collect every string value in a (possibly nested) messages object.
function flattenStrings(obj: unknown, out: string[] = []): string[] {
  if (typeof obj === "string") out.push(obj);
  else if (obj && typeof obj === "object")
    for (const v of Object.values(obj)) flattenStrings(v, out);
  return out;
}

describe.each(locales)("message catalog %s.json", (locale) => {
  const buf = rawBuffer(locale);
  const text = buf.toString("utf8");

  it("is UTF-8 without a BOM", () => {
    expect(buf.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(
      false,
    );
  });

  it("is valid UTF-8 with no double-encoding (bytes round-trip)", () => {
    // If the file were double-encoded, decoding then re-encoding as UTF-8 would
    // not reproduce the original bytes.
    expect(Buffer.from(text, "utf8").equals(buf)).toBe(true);
  });

  it("contains no mojibake signatures", () => {
    for (const sig of MOJIBAKE_SIGNATURES) {
      expect(text, `found mojibake "${sig}" in ${locale}.json`).not.toContain(
        sig,
      );
    }
  });

  it("parses as JSON", () => {
    expect(() => JSON.parse(text)).not.toThrow();
  });
});

describe("pricing renders the Indian Rupee sign", () => {
  it.each(locales)("%s.json keeps ₹ (U+20B9) intact", (locale) => {
    const messages = JSON.parse(rawBuffer(locale).toString("utf8"));
    expect(messages.pricing.free_price).toContain("₹");
    // Guard the exact codepoint, not a look-alike.
    expect(messages.pricing.free_price.codePointAt(0)).toBe(0x20b9);
  });
});

describe("native scripts are present and correct", () => {
  // Assamese uses the Bengali block (U+0980–U+09FF).
  it("Assamese text lives in the Bengali/Assamese Unicode block", () => {
    const text = flattenStrings(
      JSON.parse(rawBuffer("as").toString("utf8")),
    ).join("");
    expect(/[ঀ-৿]/.test(text)).toBe(true);
    // A specific recovered phrase, byte-for-byte.
    expect(text).toContain("আঞ্চলিক");
  });

  // Hindi uses the Devanagari block (U+0900–U+097F).
  it("Hindi text lives in the Devanagari Unicode block", () => {
    const text = flattenStrings(
      JSON.parse(rawBuffer("hi").toString("utf8")),
    ).join("");
    expect(/[ऀ-ॿ]/.test(text)).toBe(true);
    expect(text).toContain("क्षेत्रीय");
  });

  // English must stay ASCII apart from intentional symbols (₹, –, etc.) — it
  // must never contain Devanagari/Bengali, which would mean a wrong catalog.
  it("English contains no Indic script", () => {
    const text = flattenStrings(
      JSON.parse(rawBuffer("en").toString("utf8")),
    ).join("");
    expect(/[ऀ-ॿঀ-৿]/.test(text)).toBe(false);
  });
});

describe("Unicode survives module loading (build output)", () => {
  // request.ts loads catalogs via `import('../../messages/${locale}.json')`,
  // so the values below are exactly what the bundler emits and next-intl serves.
  // Importing them the same way proves the build step does not re-mangle them.
  it("Assamese survives import", async () => {
    const messages = (await import("../../messages/as.json")).default;
    expect(flattenStrings(messages).join("")).toContain("আঞ্চলিক");
    expect(messages.pricing.free_price).toBe("₹0");
  });

  it("Hindi survives import", async () => {
    const messages = (await import("../../messages/hi.json")).default;
    expect(flattenStrings(messages).join("")).toContain("क्षेत्रीय");
    expect(messages.pricing.free_price).toBe("₹0");
  });

  it("English survives import with the ₹ symbol intact", async () => {
    const messages = (await import("../../messages/en.json")).default;
    expect(messages.pricing.free_price).toBe("₹0");
  });
});
