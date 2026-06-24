// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ExamDetailDrawer, type ExamDrawerData } from "./ExamDetailDrawer";

afterEach(() => cleanup());

const EXAM_DATA: ExamDrawerData = {
  kind: "Exam",
  title: "CTET",
  rows: [
    { label: "Code", value: "CTET" },
    { label: "Type", value: "qualifying" },
    { label: "Subjects", value: "3" },
  ],
};

const SUBJECT_DATA: ExamDrawerData = {
  kind: "Subject",
  title: "Mathematics",
  rows: [{ label: "Position", value: "0" }],
  relationships: { label: "Topics", items: ["Arithmetic", "Algebra"] },
};

describe("ExamDetailDrawer (read-only)", () => {
  it("renders nothing when closed", () => {
    render(<ExamDetailDrawer open={false} onOpenChange={() => {}} data={EXAM_DATA} />);
    expect(screen.queryByText("CTET")).toBeNull();
  });

  it("shows a loading state", () => {
    render(<ExamDetailDrawer open onOpenChange={() => {}} data={null} loading />);
    expect(screen.getByRole("status", { name: "Loading details" })).toBeTruthy();
  });

  it("renders exam metadata rows", () => {
    render(<ExamDetailDrawer open onOpenChange={() => {}} data={EXAM_DATA} />);
    expect(screen.getByLabelText("Exam details")).toBeTruthy();
    expect(screen.getByText("Code")).toBeTruthy();
    expect(screen.getByText("Subjects")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders node relationships (counts + children)", () => {
    render(<ExamDetailDrawer open onOpenChange={() => {}} data={SUBJECT_DATA} />);
    expect(screen.getByText("Topics (2)")).toBeTruthy();
    expect(screen.getByText("Arithmetic")).toBeTruthy();
    expect(screen.getByText("Algebra")).toBeTruthy();
  });

  it("exposes no edit/create/delete actions, only Close", () => {
    render(<ExamDetailDrawer open onOpenChange={() => {}} data={EXAM_DATA} />);
    for (const name of [/edit/i, /create/i, /delete/i, /save/i]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.getByRole("button", { name: "Close details" })).toBeTruthy();
  });

  it("requests close via the close button", () => {
    const onOpenChange = vi.fn();
    render(<ExamDetailDrawer open onOpenChange={onOpenChange} data={EXAM_DATA} />);
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
