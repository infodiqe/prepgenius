// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { FieldError, FormField, FormSection, SubmitButton } from "./form";

afterEach(() => cleanup());

describe("FieldError", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<FieldError />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an assertive alert with the message", () => {
    const { getByRole } = render(<FieldError id="x-error">Bad value</FieldError>);
    const alert = getByRole("alert");
    expect(alert.textContent).toBe("Bad value");
    expect(alert.id).toBe("x-error");
    expect(alert.className).toContain("text-destructive");
  });
});

describe("FormField", () => {
  it("associates the label with the control via id", () => {
    const { getByLabelText } = render(
      <FormField id="email" label="Email">
        {(field) => <input type="email" {...field} />}
      </FormField>,
    );
    expect((getByLabelText("Email") as HTMLInputElement).id).toBe("email");
  });

  it("wires aria-invalid + aria-describedby to the error when invalid", () => {
    const { getByLabelText, getByRole } = render(
      <FormField id="email" label="Email" error="Required">
        {(field) => <input type="email" {...field} />}
      </FormField>,
    );
    const input = getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("email-error");
    expect(getByRole("alert").id).toBe("email-error");
  });

  it("does not set aria-invalid when valid", () => {
    const { getByLabelText } = render(
      <FormField id="email" label="Email">
        {(field) => <input {...field} />}
      </FormField>,
    );
    expect(getByLabelText("Email").getAttribute("aria-invalid")).toBeNull();
  });

  it("links a description and includes it in aria-describedby", () => {
    const { getByLabelText, getByText } = render(
      <FormField id="phone" label="Phone" description="Optional" error="Bad">
        {(field) => <input {...field} />}
      </FormField>,
    );
    expect(getByText("Optional").id).toBe("phone-description");
    expect(getByLabelText("Phone").getAttribute("aria-describedby")).toBe(
      "phone-description phone-error",
    );
  });

  it("marks required fields visually and via aria-required", () => {
    const { getByLabelText } = render(
      <FormField id="name" label="Name" required>
        {(field) => <input {...field} />}
      </FormField>,
    );
    expect(getByLabelText(/Name/).getAttribute("aria-required")).toBe("true");
  });
});

describe("FormSection", () => {
  it("is a labelled group when given a title", () => {
    const { getByRole } = render(
      <FormSection title="Account" description="Your details">
        <input />
      </FormSection>,
    );
    const group = getByRole("group");
    const labelledby = group.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    expect(document.getElementById(labelledby!)?.textContent).toBe("Account");
  });

  it("is a plain container with no group role when title is omitted", () => {
    const { queryByRole, getByTestId } = render(
      <FormSection data-testid="sec">
        <input />
      </FormSection>,
    );
    expect(queryByRole("group")).toBeNull();
    expect(getByTestId("sec")).toBeTruthy();
  });
});

describe("SubmitButton", () => {
  it("defaults to type=submit and renders its children", () => {
    const { getByRole } = render(<SubmitButton>Save</SubmitButton>);
    const button = getByRole("button", { name: "Save" });
    expect(button.getAttribute("type")).toBe("submit");
  });

  it("shows loading text, sets aria-busy, and disables while loading", () => {
    const { getByRole } = render(
      <SubmitButton isLoading loadingText="Saving…">
        Save
      </SubmitButton>,
    );
    const button = getByRole("button") as HTMLButtonElement;
    expect(button.textContent).toContain("Saving…");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.disabled).toBe(true);
  });

  it("respects an explicit disabled prop", () => {
    const { getByRole } = render(<SubmitButton disabled>Save</SubmitButton>);
    expect((getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Shared form primitives — token compliance", () => {
  it("emit only theme-token classes (no hardcoded swatches)", () => {
    const { container } = render(
      <div>
        <FormSection title="T" description="D">
          <FormField id="f" label="L" description="hint" error="err" required>
            {(field) => <input {...field} />}
          </FormField>
        </FormSection>
        <SubmitButton isLoading loadingText="…">
          Go
        </SubmitButton>
      </div>,
    );
    const html = container.innerHTML;
    expect(html).toContain("text-destructive");
    expect(html).toContain("text-muted-foreground");
    // Mirrors the S0-T13 lint guard: color name + 2-3 digit shade.
    expect(html).not.toMatch(
      /\b(slate|gray|zinc|neutral|stone|blue|indigo)-\d{2,3}\b/,
    );
  });
});
