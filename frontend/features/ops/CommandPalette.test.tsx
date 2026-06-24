// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("CommandPalette (navigation mode)", () => {
  it("opens on Ctrl+K and Cmd+K via the global shortcut", () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open={false} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    fireEvent.keyDown(document.body, { key: "k", metaKey: true });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("renders the navigation commands for every built workspace when open", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    expect(screen.getByText("Navigation")).toBeTruthy();
    for (const label of [
      "Go to Overview",
      "Go to Content Studio",
      "Go to Review Queue",
      "Go to CMS Studio",
      "Go to Exams",
      "Go to Analytics",
      "Go to Users",
      "Go to Billing",
    ]) {
      expect(screen.getByRole("option", { name: new RegExp(label) })).toBeTruthy();
    }
  });

  it("does NOT expose action-mode commands", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    expect(screen.queryByText("Approve item")).toBeNull();
    expect(screen.queryByText("Invalidate cache")).toBeNull();
    expect(screen.queryByText("Actions")).toBeNull();
  });

  it("filters the command list by query", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("Commands"), {
      target: { value: "billing" },
    });
    expect(screen.getByRole("option", { name: /Go to Billing/ })).toBeTruthy();
    expect(screen.queryByText("Go to Overview")).toBeNull();
  });

  it("navigates and closes when a command is clicked", () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("option", { name: /Go to Review Queue/ }));
    expect(push).toHaveBeenCalledWith("/ops/review");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates to the active command on Enter (keyboard)", () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} />);
    const input = screen.getByLabelText("Commands");
    // First option active by default → Overview.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/ops");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("moves the active option with ArrowDown before Enter", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    const input = screen.getByLabelText("Commands");
    fireEvent.keyDown(input, { key: "ArrowDown" }); // → Content Studio
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/ops/content");
  });

  it("shows the empty state when nothing matches", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("Commands"), {
      target: { value: "zzzzzz-no-match" },
    });
    expect(screen.getByText("No matching commands")).toBeTruthy();
  });
});
