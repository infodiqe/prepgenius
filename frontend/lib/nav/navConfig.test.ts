import { describe, it, expect } from "vitest";
import { navConfig, type NavItem, type WorkspaceNav } from "./navConfig";
import { deriveWorkspaces, DEFAULT_WORKSPACE } from "@/lib/rbac/workspaces";
import { ROLES } from "@/lib/rbac/types";
import asMessages from "@/messages/as.json";
import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";

const WORKSPACES = ["student", "review", "admin"] as const;
const localeNav: Record<string, Record<string, string>> = {
  as: asMessages.nav,
  en: enMessages.nav,
  hi: hiMessages.nav,
};

function allItems(nav: WorkspaceNav): NavItem[] {
  return [...nav.sidebar, ...nav.bottomTabs];
}

describe("navConfig structure", () => {
  it("defines sidebar and non-empty bottomTabs for every workspace", () => {
    for (const ws of WORKSPACES) {
      expect(navConfig[ws].sidebar.length).toBeGreaterThan(0);
      expect(navConfig[ws].bottomTabs.length).toBeGreaterThan(0);
    }
  });

  it("caps bottomTabs at 5 per workspace", () => {
    for (const ws of WORKSPACES) {
      expect(navConfig[ws].bottomTabs.length).toBeLessThanOrEqual(5);
    }
  });

  it("uses absolute hrefs and non-empty icon names", () => {
    for (const ws of WORKSPACES) {
      for (const item of allItems(navConfig[ws])) {
        expect(item.href.startsWith("/")).toBe(true);
        expect(item.icon.length).toBeGreaterThan(0);
        expect(item.labelKey.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("Student workspace parity with current nav", () => {
  it("matches the existing sidebar items", () => {
    expect(navConfig.student.sidebar.map((i) => i.labelKey)).toEqual([
      "dashboard",
      "practice",
      "analytics",
      "tutor",
      "profile",
    ]);
  });

  it("matches the existing bottom-tab items (first tab is 'home' → /dashboard)", () => {
    expect(navConfig.student.bottomTabs.map((i) => i.labelKey)).toEqual([
      "home",
      "practice",
      "analytics",
      "tutor",
      "profile",
    ]);
    const home = navConfig.student.bottomTabs[0];
    expect(home.href).toBe("/dashboard");
  });
});

describe("i18n key coverage", () => {
  it("resolves every labelKey in as / en / hi", () => {
    const usedKeys = new Set<string>();
    for (const ws of WORKSPACES) {
      for (const item of allItems(navConfig[ws])) usedKeys.add(item.labelKey);
    }
    for (const key of usedKeys) {
      for (const locale of ["as", "en", "hi"] as const) {
        expect(
          localeNav[locale][key],
          `nav.${key} missing in ${locale}.json`,
        ).toBeTruthy();
      }
    }
  });
});

describe("alignment with S0-T02 deriveWorkspaces", () => {
  it("every workspace deriveWorkspaces can emit has a navConfig entry", () => {
    const roleSets = [
      [] as readonly string[],
      [ROLES.STUDENT],
      [ROLES.CONTENT_REVIEWER],
      [ROLES.SME],
      [ROLES.CONTENT_MANAGER],
      [ROLES.PLATFORM_ADMIN],
      [ROLES.STUDENT, ROLES.PLATFORM_ADMIN],
    ];
    for (const roles of roleSets) {
      for (const ws of deriveWorkspaces(roles)) {
        expect(navConfig[ws]).toBeDefined();
      }
    }
  });

  it("provides a config for the default (Student) workspace", () => {
    expect(navConfig[DEFAULT_WORKSPACE]).toBeDefined();
  });

  it("navConfig keys are exactly the workspace set (no missing / extra)", () => {
    expect(Object.keys(navConfig).sort()).toEqual([...WORKSPACES].sort());
  });
});
