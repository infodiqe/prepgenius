import { describe, expect, it } from "vitest";
import {
  opsNavItems,
  visibleOpsNav,
  visibleOpsNavForPersonas,
  OPS_PERSONAS,
} from "./opsNav";

const labels = (
  items: ReturnType<typeof visibleOpsNavForPersonas>,
): string[] => items.map((i) => i.label);

describe("ops navigation visibility (config-driven)", () => {
  it("Super Admin sees the full navigation (every workspace, in order)", () => {
    expect(labels(visibleOpsNav(OPS_PERSONAS.SUPER_ADMIN))).toEqual(
      opsNavItems.map((i) => i.label),
    );
  });

  it("Reviewer sees Review only", () => {
    expect(labels(visibleOpsNav(OPS_PERSONAS.REVIEWER))).toEqual([
      "Review Queue",
    ]);
  });

  it("SME sees Review and SME Review", () => {
    expect(labels(visibleOpsNav(OPS_PERSONAS.SME))).toEqual([
      "Review Queue",
      "SME Review",
    ]);
  });

  it("Support sees only the permitted workspaces (Overview, Users)", () => {
    expect(labels(visibleOpsNav(OPS_PERSONAS.SUPPORT))).toEqual([
      "Overview",
      "Users",
    ]);
  });

  it("returns the union for multiple personas, in declared order with no dups", () => {
    const union = labels(
      visibleOpsNavForPersonas([
        OPS_PERSONAS.REVIEWER,
        OPS_PERSONAS.SME,
      ]),
    );
    expect(union).toEqual(["Review Queue", "SME Review"]);
  });

  it("returns nothing for an empty persona set", () => {
    expect(visibleOpsNavForPersonas([])).toEqual([]);
  });
});

describe("ops navigation — implemented vs Coming Soon", () => {
  const implemented = new Set([
    "/ops",
    "/ops/content",
    "/ops/review",
    "/ops/exams",
    "/ops/cms",
    "/ops/analytics",
    "/ops/users",
    "/ops/billing",
  ]);

  it("flags exactly the unbuilt workspaces as comingSoon", () => {
    for (const item of opsNavItems) {
      if (implemented.has(item.href)) {
        expect(item.comingSoon, `${item.href} should be live`).toBeFalsy();
      } else {
        expect(item.comingSoon, `${item.href} should be coming soon`).toBe(true);
      }
    }
  });

  it("marks SME Review, AI Operations, Settings as Coming Soon", () => {
    const comingSoon = opsNavItems
      .filter((i) => i.comingSoon)
      .map((i) => i.label)
      .sort();
    expect(comingSoon).toEqual(
      ["AI Operations", "SME Review", "Settings"].sort(),
    );
  });
});
