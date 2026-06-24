// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import { WorkspaceHeader } from "./WorkspaceHeader";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => cleanup());

describe("WorkspaceHeader", () => {
  it("renders the title and subtitle", () => {
    const { getByRole, getByText } = render(
      <WorkspaceHeader title="Review Queue" subtitle="Your assigned items" />,
    );
    expect(getByRole("heading", { name: "Review Queue" })).toBeTruthy();
    expect(getByText("Your assigned items")).toBeTruthy();
  });

  it("renders breadcrumbs with the last crumb marked current", () => {
    const { getByRole } = render(
      <WorkspaceHeader
        title="Item"
        breadcrumbs={[
          { label: "Content Studio", href: "/ops/content" },
          { label: "Item 42" },
        ]}
      />,
    );
    const crumbs = getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Content Studio" })).toBeTruthy();
    expect(
      within(crumbs).getByText("Item 42").getAttribute("aria-current"),
    ).toBe("page");
  });

  it("renders primary and secondary action slots", () => {
    const { getByTestId } = render(
      <WorkspaceHeader
        title="Exams"
        primaryAction={<button data-testid="primary">New</button>}
        secondaryActions={<button data-testid="secondary">Export</button>}
      />,
    );
    expect(getByTestId("primary")).toBeTruthy();
    expect(getByTestId("secondary")).toBeTruthy();
  });

  it("omits the breadcrumb nav when no crumbs are given", () => {
    const { queryByRole } = render(<WorkspaceHeader title="Settings" />);
    expect(queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
  });
});
