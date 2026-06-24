// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { CreditAdjustmentDrawer } from "./CreditAdjustmentDrawer";
import { adjustUserCredits } from "./billingService";
import { ApiError } from "@/lib/errors";

vi.mock("./billingService", () => ({ adjustUserCredits: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function baseProps(
  over: Partial<React.ComponentProps<typeof CreditAdjustmentDrawer>> = {},
): React.ComponentProps<typeof CreditAdjustmentDrawer> {
  return {
    open: true,
    onOpenChange: vi.fn(),
    userId: "u-1",
    userName: "Amla Bora",
    onAdjusted: vi.fn(),
    ...over,
  };
}

describe("CreditAdjustmentDrawer (Part E)", () => {
  it("renders nothing when closed", () => {
    render(<CreditAdjustmentDrawer {...baseProps({ open: false })} />);
    expect(screen.queryByLabelText("Adjust credits")).toBeNull();
  });

  it("has a labelled dialog, amount + reason fields and a close button", () => {
    render(<CreditAdjustmentDrawer {...baseProps()} />);
    expect(screen.getByLabelText("Adjust credits")).toBeTruthy();
    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByLabelText("Reason")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close details" })).toBeTruthy();
  });

  it("disables confirm until a non-zero amount is entered", () => {
    render(<CreditAdjustmentDrawer {...baseProps()} />);
    const confirm = () =>
      screen.getByRole("button", { name: "Confirm adjustment" }) as HTMLButtonElement;
    expect(confirm().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "0" } });
    expect(confirm().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "50" } });
    expect(confirm().disabled).toBe(false);
  });

  it("posts the adjustment, reloads via onAdjusted and closes on success", async () => {
    (adjustUserCredits as Mock).mockResolvedValue({ balance: {}, entry: {} });
    const onAdjusted = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CreditAdjustmentDrawer {...baseProps({ onAdjusted, onOpenChange })} />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "-25" } });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "refund" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm adjustment" }));
    await waitFor(() =>
      expect(adjustUserCredits).toHaveBeenCalledWith("u-1", {
        amount: "-25",
        description: "refund",
      }),
    );
    expect(onAdjusted).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows the server error verbatim and does not close on failure", async () => {
    const detail = "Adjustment would drive the available balance negative.";
    (adjustUserCredits as Mock).mockRejectedValue(
      new ApiError(400, { detail }, detail),
    );
    const onOpenChange = vi.fn();
    render(<CreditAdjustmentDrawer {...baseProps({ onOpenChange })} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "-999" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm adjustment" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(detail);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
