import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

/**
 * Regression tests for the token-migration lint guard (S0-T13).
 *
 * Reads the real `no-restricted-syntax` configuration from `.eslintrc.json` and
 * runs ESLint against snippets, so the test validates the *actual* selectors
 * (not a copy) and catches drift.
 */

const cfg = JSON.parse(
  readFileSync(path.resolve(process.cwd(), ".eslintrc.json"), "utf8"),
);
const ruleOptions = cfg.rules?.["no-restricted-syntax"];

async function errorCount(code: string): Promise<number> {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: { rules: { "no-restricted-syntax": ruleOptions } },
  });
  const [result] = await eslint.lintText(code, { filePath: "snippet.js" });
  return result.errorCount;
}

describe("lint guard configuration", () => {
  it("configures no-restricted-syntax as an error globally", () => {
    expect(Array.isArray(ruleOptions)).toBe(true);
    expect(ruleOptions[0]).toBe("error");
  });

  it("tracks a legacy allow-list via overrides", () => {
    expect(Array.isArray(cfg.overrides)).toBe(true);
    expect(cfg.overrides[0].files.length).toBeGreaterThan(0);
    // Legacy files are warned, not errored (build stays green).
    expect(cfg.overrides[0].rules["no-restricted-syntax"][0]).toBe("warn");
  });
});

describe("forbidden hardcoded color utilities are flagged", () => {
  it.each([
    "bg-slate-900",
    "text-blue-500",
    "border-indigo-600",
    "bg-blue-600/10",
    "bg-gray-100",
    "ring-zinc-700",
    "bg-neutral-50",
    "text-stone-400",
  ])("flags %s", async (cls) => {
    expect(await errorCount(`const x = "${cls}";`)).toBeGreaterThanOrEqual(1);
  });

  it("flags utilities inside template literals", async () => {
    expect(await errorCount("const x = `flex bg-slate-950 p-2`;")).toBeGreaterThanOrEqual(1);
  });
});

describe("semantic token classes are allowed", () => {
  it.each([
    "bg-background",
    "bg-card",
    "bg-primary",
    "text-foreground",
    "text-primary",
    "border-border",
    "ring-ring",
    "bg-muted",
    "text-muted-foreground",
    "bg-secondary",
    "text-accent-foreground",
  ])("allows %s", async (cls) => {
    expect(await errorCount(`const x = "${cls}";`)).toBe(0);
  });

  it.each(["translate-x-2", "bg-primary/90", "rounded-lg", "slate-foo"])(
    "does not false-positive on %s",
    async (cls) => {
      expect(await errorCount(`const x = "${cls}";`)).toBe(0);
    },
  );
});
