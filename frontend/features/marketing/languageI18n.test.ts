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

describe("language namespace i18n coverage", () => {
  const locales: Record<string, Json> = {
    en: en as Json,
    as: as as Json,
    hi: hi as Json,
  };
  const REQUIRED = ["language_selector", "assamese", "hindi", "english"];

  it("defines the required language keys in every locale", () => {
    for (const [name, locale] of Object.entries(locales)) {
      const ns = locale.language as Json | undefined;
      expect(ns, `locale ${name} missing language namespace`).toBeDefined();
      for (const key of REQUIRED) {
        expect(ns?.[key], `locale ${name} missing language.${key}`).toBeTruthy();
      }
    }
  });

  it("uses identical keys across locales", () => {
    const reference = flattenKeys(en.language as Json).sort();
    for (const [name, locale] of Object.entries(locales)) {
      const keys = flattenKeys(locale.language as Json).sort();
      expect(keys, `locale ${name} key parity`).toEqual(reference);
    }
  });
});
