// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { OriginBadge, originLabel } from "./OriginBadge";

afterEach(() => cleanup());

describe("OriginBadge (content trust signal)", () => {
  it("labels each known origin with text (not colour alone)", () => {
    expect(originLabel("official")).toBe("Official");
    expect(originLabel("ai")).toBe("AI Generated");
    expect(originLabel("manual")).toBe("Human Authored");
  });

  it("renders a text label + icon for a known origin", () => {
    const { container } = render(<OriginBadge origin="ai" />);
    expect(screen.getByText("AI Generated")).toBeTruthy();
    // colorblind-safe: an icon accompanies the colour.
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders nothing when origin is absent (no fabricated value)", () => {
    const { container } = render(<OriginBadge origin={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an unknown origin verbatim rather than hiding it", () => {
    render(<OriginBadge origin={"imported" as never} />);
    expect(screen.getByText("imported")).toBeTruthy();
  });
});
