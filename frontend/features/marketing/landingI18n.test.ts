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

function leafValues(obj: Json): string[] {
  return Object.values(obj).flatMap((value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? leafValues(value as Json)
      : [String(value)],
  );
}

describe("landing i18n coverage", () => {
  const locales: Record<string, Json> = {
    en: en as Json,
    as: as as Json,
    hi: hi as Json,
  };

  it("defines a landing namespace in every locale", () => {
    for (const [name, locale] of Object.entries(locales)) {
      expect(locale.landing, `locale ${name} missing landing`).toBeDefined();
    }
  });

  it("uses identical landing keys across locales", () => {
    const reference = flattenKeys(en.landing as Json).sort();
    expect(reference.length).toBeGreaterThan(0);
    for (const [name, locale] of Object.entries(locales)) {
      const keys = flattenKeys(locale.landing as Json).sort();
      expect(keys, `locale ${name} key parity`).toEqual(reference);
    }
  });

  it("has no empty landing strings", () => {
    for (const [name, locale] of Object.entries(locales)) {
      for (const value of leafValues(locale.landing as Json)) {
        expect(value.trim().length, `locale ${name} empty value`).toBeGreaterThan(
          0,
        );
      }
    }
  });
});
