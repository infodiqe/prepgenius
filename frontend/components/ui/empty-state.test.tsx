// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "./empty-state";

afterEach(() => cleanup());

function Fixture() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <svg data-testid="icon" />
      </EmptyStateIcon>
      <EmptyStateTitle>No results yet</EmptyStateTitle>
      <EmptyStateDescription>
        Take a mock test to see your analytics.
      </EmptyStateDescription>
      <EmptyStateAction>
        <button type="button">Start a mock</button>
      </EmptyStateAction>
    </EmptyState>
  );
}

describe("EmptyState — render", () => {
  it("renders title, description and action content", () => {
    const { getByText, getByRole } = render(<Fixture />);
    expect(getByText("No results yet")).toBeTruthy();
    expect(getByText("Take a mock test to see your analytics.")).toBeTruthy();
    expect(getByRole("button", { name: "Start a mock" })).toBeTruthy();
  });

  it("forwards arbitrary props/className to the root", () => {
    const { getByTestId } = render(
      <EmptyState data-testid="es" className="custom-x" />,
    );
    const root = getByTestId("es");
    expect(root.className).toContain("custom-x");
  });
});

describe("EmptyState — accessibility", () => {
  it("renders the title as a real heading (default h2)", () => {
    const { getByRole } = render(<EmptyStateTitle>Nothing here</EmptyStateTitle>);
    const heading = getByRole("heading", { level: 2 });
    expect(heading.tagName).toBe("H2");
  });

  it("lets the heading level be overridden via `as`", () => {
    const { getByRole } = render(
      <EmptyStateTitle as="h3">Nothing here</EmptyStateTitle>,
    );
    expect(getByRole("heading", { level: 3 })).toBeTruthy();
  });

  it("marks the icon badge as decorative (aria-hidden)", () => {
    const { container } = render(
      <EmptyStateIcon>
        <svg />
      </EmptyStateIcon>,
    );
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("keeps the action area keyboard focusable", () => {
    const { getByRole } = render(
      <EmptyStateAction>
        <button type="button">Retry</button>
      </EmptyStateAction>,
    );
    const button = getByRole("button", { name: "Retry" });
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});

describe("EmptyState — token compliance (no hardcoded colours)", () => {
  const swatches = ["gray-", "slate-", "zinc-", "neutral-", "white", "black", "#"];

  it("paints only with foreground/muted tokens", () => {
    const { container } = render(<Fixture />);
    const html = container.innerHTML;
    expect(html).toContain("text-foreground");
    expect(html).toContain("text-muted-foreground");
    expect(html).toContain("bg-muted");
    for (const swatch of swatches) {
      expect(html).not.toContain(`text-${swatch}`);
      expect(html).not.toContain(`bg-${swatch}`);
    }
  });
});

describe("EmptyState — responsive behaviour", () => {
  it("centers and pads the container fluidly", () => {
    const { getByTestId } = render(<EmptyState data-testid="es" />);
    const cls = getByTestId("es").className;
    expect(cls).toContain("flex-col");
    expect(cls).toContain("items-center");
    expect(cls).toContain("px-6");
    expect(cls).toContain("py-12");
  });

  it("stacks actions on mobile and rows them from sm up", () => {
    const { getByTestId } = render(
      <EmptyStateAction data-testid="action" />,
    );
    const cls = getByTestId("action").className;
    expect(cls).toContain("flex-col");
    expect(cls).toContain("sm:flex-row");
  });

  it("caps the description width for readable line length", () => {
    const { getByText } = render(
      <EmptyStateDescription>Some helper copy.</EmptyStateDescription>,
    );
    expect(getByText("Some helper copy.").className).toContain("max-w-sm");
  });
});
