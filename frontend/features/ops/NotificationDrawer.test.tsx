// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { NotificationDrawer } from "./NotificationDrawer";

afterEach(() => cleanup());

describe("NotificationDrawer", () => {
  it("renders nothing when closed", () => {
    render(<NotificationDrawer open={false} onOpenChange={() => {}} />);
    expect(screen.queryByText("Notifications")).toBeNull();
  });

  it("shows an honest empty state (no mock notifications)", () => {
    render(<NotificationDrawer open onOpenChange={() => {}} />);
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText(/all caught up/i)).toBeTruthy();
    // The previous mock streams must be gone.
    expect(screen.queryByText("Assignments")).toBeNull();
    expect(screen.queryByText("System alerts")).toBeNull();
    expect(screen.queryByText("Commerce")).toBeNull();
    expect(screen.queryByText("Mentions")).toBeNull();
  });

  it("requests close via the close button", () => {
    const onOpenChange = vi.fn();
    render(<NotificationDrawer open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByLabelText("Close notifications"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
