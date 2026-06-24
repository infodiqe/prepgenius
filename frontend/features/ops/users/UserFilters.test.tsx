// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { UserFilters } from "./UserFilters";

afterEach(() => cleanup());

function baseProps(
  over: Partial<React.ComponentProps<typeof UserFilters>> = {},
): React.ComponentProps<typeof UserFilters> {
  return {
    search: "",
    onSearchChange: vi.fn(),
    onSearchSubmit: vi.fn(),
    status: "",
    role: "",
    targetExam: "",
    onStatusChange: vi.fn(),
    onRoleChange: vi.fn(),
    onTargetExamChange: vi.fn(),
    roleOptions: ["support", "platform_admin"],
    examOptions: [{ id: "exam-1", name: "CTET" }],
    ...over,
  };
}

describe("UserFilters (server-side, controlled)", () => {
  it("renders enabled, labelled search and filter controls", () => {
    render(<UserFilters {...baseProps()} />);
    expect((screen.getByLabelText("Search users") as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText("Status") as HTMLSelectElement).disabled).toBe(false);
    expect((screen.getByLabelText("Role") as HTMLSelectElement).disabled).toBe(false);
    expect((screen.getByLabelText("Target exam") as HTMLSelectElement).disabled).toBe(false);
  });

  it("reports search typing and submits on form submit", () => {
    const onSearchChange = vi.fn();
    const onSearchSubmit = vi.fn();
    render(<UserFilters {...baseProps({ onSearchChange, onSearchSubmit })} />);
    fireEvent.change(screen.getByLabelText("Search users"), {
      target: { value: "amla" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("amla");
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearchSubmit).toHaveBeenCalled();
  });

  it("reports status, role and exam changes (server-side filters)", () => {
    const onStatusChange = vi.fn();
    const onRoleChange = vi.fn();
    const onTargetExamChange = vi.fn();
    render(
      <UserFilters
        {...baseProps({ onStatusChange, onRoleChange, onTargetExamChange })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "suspended" },
    });
    expect(onStatusChange).toHaveBeenCalledWith("suspended");
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "support" },
    });
    expect(onRoleChange).toHaveBeenCalledWith("support");
    fireEvent.change(screen.getByLabelText("Target exam"), {
      target: { value: "exam-1" },
    });
    expect(onTargetExamChange).toHaveBeenCalledWith("exam-1");
  });

  it("populates the exam options from the provided list", () => {
    render(<UserFilters {...baseProps()} />);
    expect(screen.getByRole("option", { name: "CTET" })).toBeTruthy();
  });
});
