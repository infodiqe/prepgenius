// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { ContactPage } from "./ContactPage";

afterEach(() => cleanup());

describe("ContactPage", () => {
  it("shows support and business emails as mailto links", () => {
    render(<ContactPage />);
    expect(
      screen.getByRole("link", { name: "support_email" }).getAttribute("href"),
    ).toBe("mailto:support_email");
    expect(
      screen.getByRole("link", { name: "business_email" }).getAttribute("href"),
    ).toBe("mailto:business_email");
  });

  it("renders a disabled, coming-soon submit button (no backend)", () => {
    render(<ContactPage />);
    const button = screen.getByRole("button", {
      name: "form_submit",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("type")).toBe("button");
  });

  it("disables every form input until the backend exists", () => {
    render(<ContactPage />);
    expect(
      (screen.getByLabelText("form_name_label") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("form_email_label") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("form_message_label") as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
  });
});
