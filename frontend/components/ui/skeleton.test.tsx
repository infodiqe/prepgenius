// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonStat,
} from "./skeleton";

afterEach(() => cleanup());

type Case = [name: string, node: React.ReactElement];

// Composites that own the loading-region semantics.
const regions: Case[] = [
  ["SkeletonText", <SkeletonText key="t" />],
  ["SkeletonCard", <SkeletonCard key="c" />],
  ["SkeletonList", <SkeletonList key="l" />],
  ["SkeletonStat", <SkeletonStat key="s" />],
];

describe("Skeleton (base shape)", () => {
  it("renders a decorative, pulsing block", () => {
    const { container } = render(<Skeleton data-testid="sk" />);
    const el = container.firstElementChild!;
    expect(el).toBeTruthy();
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.className).toContain("animate-pulse");
  });

  it("merges consumer classes and allows aria override", () => {
    const { container } = render(
      <Skeleton className="h-8 w-8" aria-hidden={false} />,
    );
    const el = container.firstElementChild!;
    expect(el.className).toContain("h-8");
    expect(el.getAttribute("aria-hidden")).toBe("false");
  });
});

describe("SkeletonAvatar", () => {
  it("renders a circular shape sized by the size prop", () => {
    const { container } = render(<SkeletonAvatar size="lg" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain("rounded-full");
    expect(el.className).toContain("h-12");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Render — composites mount with expected child counts", () => {
  it("SkeletonText renders the requested number of lines", () => {
    const { getByRole } = render(<SkeletonText lines={5} />);
    // 5 line shapes + 1 sr-only label span = 6 children.
    expect(getByRole("status").children.length).toBe(6);
  });

  it("SkeletonList renders the requested number of rows", () => {
    const { getByRole } = render(<SkeletonList count={4} />);
    // 4 rows + 1 sr-only label span.
    expect(getByRole("status").children.length).toBe(5);
  });

  it("SkeletonStat renders the requested number of tiles", () => {
    const { getByRole } = render(<SkeletonStat count={2} />);
    expect(getByRole("status").children.length).toBe(3);
  });

  it("SkeletonCard mounts", () => {
    const { getByRole } = render(<SkeletonCard />);
    expect(getByRole("status")).toBeTruthy();
  });
});

describe("Accessibility — region semantics", () => {
  it.each(regions)("%s exposes role=status and aria-busy", (_name, node) => {
    const { getByRole } = render(node);
    const region = getByRole("status");
    expect(region.getAttribute("aria-busy")).toBe("true");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it.each(regions)("%s carries a visually-hidden default label", (_name, node) => {
    const { getByText } = render(node);
    const label = getByText("Loading…");
    expect(label.className).toContain("sr-only");
  });

  it("respects a custom screen-reader label", () => {
    const { getByText } = render(<SkeletonText label="Loading results" />);
    expect(getByText("Loading results")).toBeTruthy();
  });
});

describe("Theme compatibility — token-driven, no hardcoded colours", () => {
  const swatches = ["gray-", "slate-", "zinc-", "neutral-", "white", "black", "#"];

  const cases: Case[] = [
    ["Skeleton", <Skeleton key="base" />],
    ["SkeletonAvatar", <SkeletonAvatar key="av" />],
    ...regions,
  ];

  it.each(cases)("%s paints only with the muted/card tokens", (_name, node) => {
    const { container } = render(node);
    const html = container.innerHTML;
    expect(html).toContain("bg-muted");
    for (const swatch of swatches) {
      expect(html).not.toContain(`bg-${swatch}`);
    }
  });
});

describe("Reduced motion", () => {
  const cases: Case[] = [["Skeleton", <Skeleton key="base" />], ...regions];

  it.each(cases)(
    "%s disables animation under prefers-reduced-motion",
    (_name, node) => {
      const { container } = render(node);
      const html = container.innerHTML;
      expect(html).toContain("animate-pulse");
      expect(html).toContain("motion-reduce:animate-none");
    },
  );
});
