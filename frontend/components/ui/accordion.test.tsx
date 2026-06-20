// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Accordion, AccordionItem } from "./accordion";

afterEach(() => cleanup());

describe("Accordion", () => {
  it("renders the question and hides the answer by default", () => {
    render(
      <Accordion>
        <AccordionItem question="Question one" answer="Answer one" />
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "Question one" });
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Answer one")).toBeNull();
  });

  it("expands and collapses on click", () => {
    render(
      <Accordion>
        <AccordionItem question="Question one" answer="Answer one" />
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "Question one" });

    fireEvent.click(trigger);
    expect(screen.getByText("Answer one")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(trigger);
    expect(screen.queryByText("Answer one")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("respects defaultOpen", () => {
    render(
      <Accordion>
        <AccordionItem question="Q" answer="Visible answer" defaultOpen />
      </Accordion>,
    );
    expect(screen.getByText("Visible answer")).toBeTruthy();
  });
});
