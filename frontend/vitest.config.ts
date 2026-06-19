import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal Vitest setup (introduced in Sprint 0 · S0-T01 — first FE test runner).
// `@/*` alias mirrors tsconfig.json so test imports match app imports.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.{ts,tsx}",
      "features/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules/**", ".next/**"],
  },
});
