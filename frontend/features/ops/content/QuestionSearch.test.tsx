// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { QuestionSearch } from "./QuestionSearch";

afterEach(() => cleanup());

describe("QuestionSearch (disabled — awaiting backend support)", () => {
  it("renders ID and text search inputs, both disabled", () => {
    render(<QuestionSearch />);
    const idInput = screen.getByPlaceholderText("Search by question ID");
    const textInput = screen.getByPlaceholderText("Search question text");
    expect((idInput as HTMLInputElement).disabled).toBe(true);
    expect((textInput as HTMLInputElement).disabled).toBe(true);
  });

  it("explains the gap with an awaiting-backend note", () => {
    render(<QuestionSearch />);
    expect(
      screen.getByText(/awaiting backend support/i),
    ).toBeTruthy();
  });

  it("labels the search region for screen readers", () => {
    render(<QuestionSearch />);
    expect(screen.getByRole("region", { name: "Search questions" })).toBeTruthy();
  });
});
