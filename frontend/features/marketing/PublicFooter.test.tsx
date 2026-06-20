// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { PublicFooter } from "./PublicFooter";
import { PUBLIC_ROUTES } from "@/lib/seo/config";

afterEach(() => cleanup());

describe("PublicFooter", () => {
  it("links the company/legal pages to real, registered public routes", () => {
    render(<PublicFooter />);
    const routeHrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/"));

    for (const href of ["/about", "/contact", "/privacy", "/terms"]) {
      expect(routeHrefs).toContain(href);
      // Each footer route must resolve to a route we actually publish.
      expect(PUBLIC_ROUTES).toContain(href);
    }
  });
});
