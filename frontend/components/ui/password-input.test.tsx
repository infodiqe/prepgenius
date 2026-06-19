// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { PasswordInput } from "./password-input";

afterEach(() => cleanup());

describe("PasswordInput", () => {
  it("renders a masked input by default", () => {
    const { container } = render(<PasswordInput defaultValue="secret" />);
    expect(container.querySelector("input")?.getAttribute("type")).toBe(
      "password",
    );
  });

  it("toggles visibility and swaps the toggle's accessible label", () => {
    const { getByRole, container } = render(
      <PasswordInput showAriaLabel="Show" hideAriaLabel="Hide" />,
    );
    const input = container.querySelector("input")!;
    const toggle = getByRole("button", { name: "Show" });

    expect(input.getAttribute("type")).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);
    expect(input.getAttribute("type")).toBe("text");
    expect(getByRole("button", { name: "Hide" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("forwards its ref to the underlying input (react-hook-form compatible)", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} />);
    expect(ref.current?.tagName).toBe("INPUT");
  });

  it("forwards input props (name/aria) for register() spreading", () => {
    const { container } = render(
      <PasswordInput name="password" aria-invalid id="pw" aria-describedby="pw-error" />,
    );
    const input = container.querySelector("input")!;
    expect(input.getAttribute("name")).toBe("password");
    expect(input.id).toBe("pw");
    expect(input.getAttribute("aria-describedby")).toBe("pw-error");
  });

  it("disables both the input and the toggle when disabled", () => {
    const { getByRole, container } = render(<PasswordInput disabled />);
    expect((container.querySelector("input") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect((getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("uses theme tokens, not hardcoded colors", () => {
    const { container } = render(<PasswordInput />);
    const html = container.innerHTML;
    expect(html).toContain("text-muted-foreground");
    // Mirrors the S0-T13 lint guard: color name + 2-3 digit shade.
    expect(html).not.toMatch(
      /\b(slate|gray|zinc|neutral|stone|blue|indigo)-\d{2,3}\b/,
    );
  });
});
