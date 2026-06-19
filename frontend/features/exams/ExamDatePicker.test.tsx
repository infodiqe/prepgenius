// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExamDatePicker } from "./ExamDatePicker";

afterEach(() => cleanup());

function setup(props: Partial<React.ComponentProps<typeof ExamDatePicker>> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const result = render(
    <ExamDatePicker
      value=""
      onChange={onChange}
      label="Exam Date"
      {...props}
    />,
  );
  return { ...result, onChange };
}

describe("ExamDatePicker — rendering", () => {
  it("renders a native date control associated with its label", () => {
    setup({ id: "exam_date" });
    const input = screen.getByLabelText("Exam Date") as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.id).toBe("exam_date");
  });

  it("reflects the controlled value", () => {
    setup({ value: "2099-12-31" });
    expect((screen.getByLabelText("Exam Date") as HTMLInputElement).value).toBe(
      "2099-12-31",
    );
  });
});

describe("ExamDatePicker — selection & disabled", () => {
  it("calls onChange with the chosen date string", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Exam Date"), {
      target: { value: "2030-05-01" },
    });
    expect(onChange).toHaveBeenCalledWith("2030-05-01");
  });

  it("disables the control when disabled", () => {
    setup({ disabled: true });
    expect((screen.getByLabelText("Exam Date") as HTMLInputElement).disabled).toBe(
      true,
    );
  });
});

describe("ExamDatePicker — min/max (presentation hints only)", () => {
  it("passes minDate/maxDate through to the native input", () => {
    setup({ minDate: "2026-06-19", maxDate: "2027-06-19" });
    const input = screen.getByLabelText("Exam Date") as HTMLInputElement;
    expect(input.getAttribute("min")).toBe("2026-06-19");
    expect(input.getAttribute("max")).toBe("2027-06-19");
  });

  it("omits min/max when not provided (no business rule baked in)", () => {
    setup();
    const input = screen.getByLabelText("Exam Date") as HTMLInputElement;
    expect(input.getAttribute("min")).toBeNull();
    expect(input.getAttribute("max")).toBeNull();
  });
});

describe("ExamDatePicker — loading state (T03)", () => {
  it("renders a busy skeleton and no control while loading", () => {
    const { container } = render(
      <ExamDatePicker
        value=""
        onChange={vi.fn()}
        label="Exam Date"
        loading
        loadingLabel="Loading date"
      />,
    );
    expect(screen.queryByLabelText("Exam Date")).toBeNull();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading date")).toBeTruthy();
  });
});

describe("ExamDatePicker — accessibility", () => {
  it("wires aria-invalid + aria-describedby + role=alert when in error", () => {
    setup({ id: "exam_date", error: "Choose a date" });
    const input = screen.getByLabelText("Exam Date");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("exam_date-error");
    const alert = screen.getByRole("alert");
    expect(alert.id).toBe("exam_date-error");
    expect(alert.textContent).toBe("Choose a date");
  });

  it("marks the control as required via aria-required", () => {
    setup({ id: "exam_date", required: true });
    expect(
      screen.getByLabelText(/Exam Date/).getAttribute("aria-required"),
    ).toBe("true");
  });
});

describe("ExamDatePicker — token compliance", () => {
  it("uses theme tokens, not hardcoded color swatches", () => {
    const { container } = setup({ error: "x" });
    const html = container.innerHTML;
    expect(html).toContain("border-destructive");
    // Mirrors the S0-T13 lint guard: color name + 2-3 digit shade.
    expect(html).not.toMatch(
      /\b(slate|gray|zinc|neutral|stone|blue|indigo)-\d{2,3}\b/,
    );
  });
});
