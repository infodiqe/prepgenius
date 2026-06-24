import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

type Json = Record<string, unknown>;

function flattenKeys(obj: Json, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as Json, path);
    }
    return [path];
  });
}

const locales: Record<string, Json> = {
  en: en as Json,
  as: as as Json,
  hi: hi as Json,
};

describe.each(["guides_index", "guides_detail"])(
  "%s i18n coverage",
  (namespace) => {
    it("defines the namespace in every locale", () => {
      for (const [name, locale] of Object.entries(locales)) {
        expect(locale[namespace], `locale ${name}`).toBeDefined();
      }
    });

    it("uses identical keys across locales", () => {
      const reference = flattenKeys(
        (en as Json)[namespace] as Json,
      ).sort();
      expect(reference.length).toBeGreaterThan(0);
      for (const [name, locale] of Object.entries(locales)) {
        const keys = flattenKeys(locale[namespace] as Json).sort();
        expect(keys, `locale ${name} key parity`).toEqual(reference);
      }
    });
  },
);
