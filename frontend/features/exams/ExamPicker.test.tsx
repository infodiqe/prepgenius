// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExamPicker } from "./ExamPicker";

afterEach(() => cleanup());

const EXAMS = [
  { id: "e1", name: "CTET", code: "CTET" },
  { id: "e2", name: "Assam TET", code: "ATET" },
];

function setup(props: Partial<React.ComponentProps<typeof ExamPicker>> = {}) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <ExamPicker
      exams={EXAMS}
      value=""
      onChange={onChange}
      label="Target Exam"
      placeholder="Select an exam"
      {...props}
    />,
  );
  return { onChange };
}

describe("ExamPicker — rendering", () => {
  it("renders an option per exam (name + code)", () => {
    setup();
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.getByRole("option", { name: "CTET (CTET)" })).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Assam TET (ATET)" }),
    ).toBeTruthy();
  });

  it("reflects the controlled value as the selection", () => {
    setup({ value: "e2" });
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("e2");
  });

  it("shows only active exams (is_active === false is hidden)", () => {
    render(
      <ExamPicker
        exams={[
          { id: "e1", name: "CTET", code: "CTET", is_active: true },
          { id: "e2", name: "Retired", code: "OLD", is_active: false },
        ]}
        value=""
        onChange={vi.fn()}
        label="Target Exam"
        placeholder="Select an exam"
      />,
    );
    expect(screen.getByRole("option", { name: "CTET (CTET)" })).toBeTruthy();
    expect(
      screen.queryByRole("option", { name: "Retired (OLD)" }),
    ).toBeNull();
  });
});

describe("ExamPicker — selection & disabled", () => {
  it("calls onChange with the chosen exam id", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "e2" },
    });
    expect(onChange).toHaveBeenCalledWith("e2");
  });

  it("disables the control when disabled", () => {
    setup({ disabled: true });
    expect((screen.getByRole("combobox") as HTMLSelectElement).disabled).toBe(
      true,
    );
  });
});

describe("ExamPicker — loading state (T03)", () => {
  it("renders a busy skeleton placeholder and no control while loading", () => {
    const { container } = render(
      <ExamPicker
        exams={EXAMS}
        value=""
        onChange={vi.fn()}
        label="Target Exam"
        loading
        loadingLabel="Loading exams"
      />,
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading exams")).toBeTruthy();
  });
});

describe("ExamPicker — empty state (T04)", () => {
  it("renders the empty state when there are no active exams", () => {
    render(
      <ExamPicker
        exams={[]}
        value=""
        onChange={vi.fn()}
        label="Target Exam"
        emptyTitle="No exams available"
        emptyDescription="Check back soon."
      />,
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("No exams available")).toBeTruthy();
    expect(screen.getByText("Check back soon.")).toBeTruthy();
  });
});

describe("ExamPicker — accessibility", () => {
  it("associates the label with the control", () => {
    setup({ id: "exam" });
    expect((screen.getByLabelText("Target Exam") as HTMLSelectElement).id).toBe(
      "exam",
    );
  });

  it("wires aria-invalid + aria-describedby + role=alert when in error", () => {
    setup({ id: "exam", error: "Please choose an exam" });
    const control = screen.getByLabelText("Target Exam");
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(control.getAttribute("aria-describedby")).toContain("exam-error");
    const alert = screen.getByRole("alert");
    expect(alert.id).toBe("exam-error");
    expect(alert.textContent).toBe("Please choose an exam");
  });

  it("marks the control as required via aria-required", () => {
    setup({ id: "exam", required: true });
    // Asterisk is appended to the label, so match loosely.
    expect(
      screen.getByLabelText(/Target Exam/).getAttribute("aria-required"),
    ).toBe("true");
  });
});
