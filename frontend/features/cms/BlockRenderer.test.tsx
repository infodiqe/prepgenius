// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BlockRenderer } from "./BlockRenderer";
import type { CmsBlock } from "@/lib/cms/api";

afterEach(() => cleanup());

function block(type: string, content: Record<string, unknown>): CmsBlock {
  return { block_type: type, sort_order: 0, content };
}

describe("BlockRenderer", () => {
  it("renders a hero block with title, subtitle and CTA", () => {
    render(
      <BlockRenderer
        block={block("hero", {
          title: "Hero Title",
          subtitle: "Hero Subtitle",
          cta_label: "Go",
          cta_href: "/register",
        })}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Hero Title" }),
    ).toBeTruthy();
    expect(screen.getByText("Hero Subtitle")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go" }).getAttribute("href")).toBe(
      "/register",
    );
  });

  it("renders rich text HTML", () => {
    render(
      <BlockRenderer
        block={block("rich_text", { html: "<p>Rich body text</p>" })}
      />,
    );
    expect(screen.getByText("Rich body text")).toBeTruthy();
  });

  it("renders an FAQ block as an accordion", () => {
    render(
      <BlockRenderer
        block={block("faq", {
          items: [{ question: "Q one", answer: "A one" }],
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Q one" })).toBeTruthy();
    // Answers collapsed by default.
    expect(screen.queryByText("A one")).toBeNull();
  });

  it("renders a CTA block with a button link", () => {
    render(
      <BlockRenderer
        block={block("cta", {
          title: "Ready?",
          button_label: "Join",
          button_href: "/waitlist",
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Ready?" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Join" }).getAttribute("href")).toBe(
      "/waitlist",
    );
  });

  it("renders nothing for an unknown block type", () => {
    const { container } = render(
      <BlockRenderer block={block("unknown_type", { foo: "bar" })} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
