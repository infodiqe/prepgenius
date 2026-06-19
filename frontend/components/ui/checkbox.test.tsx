// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { Checkbox } from "./checkbox";

afterEach(() => cleanup());

describe("Checkbox", () => {
  it("renders a native checkbox input", () => {
    const { container } = render(<Checkbox />);
    expect(container.querySelector("input")?.getAttribute("type")).toBe(
      "checkbox",
    );
  });

  it("toggles checked state on click", () => {
    const { container } = render(<Checkbox />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.checked).toBe(false);
    fireEvent.click(input);
    expect(input.checked).toBe(true);
  });

  it("forwards its ref to the underlying input (react-hook-form compatible)", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} />);
    expect(ref.current?.tagName).toBe("INPUT");
  });

  it("forwards input props (name/aria/id) for register() spreading", () => {
    const { container } = render(
      <Checkbox
        name="consent"
        id="consent"
        aria-invalid
        aria-required
        aria-describedby="consent-error"
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("name")).toBe("consent");
    expect(input.id).toBe("consent");
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("consent-error");
  });

  it("disables the input when disabled", () => {
    const { container } = render(<Checkbox disabled />);
    expect(
      (container.querySelector("input") as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("uses theme tokens, not hardcoded colors", () => {
    const { container } = render(<Checkbox />);
    const html = container.innerHTML;
    expect(html).toContain("accent-primary");
    expect(html).toContain("border-input");
    // Mirrors the S0-T13 lint guard: color name + 2-3 digit shade.
    expect(html).not.toMatch(
      /\b(slate|gray|zinc|neutral|stone|blue|indigo)-\d{2,3}\b/,
    );
  });
});
