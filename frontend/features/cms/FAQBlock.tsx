import * as React from "react";
import { Accordion, AccordionItem } from "@/components/ui";
import { asFaqItems, asString } from "./blockContent";

export function FAQBlock({ content }: { content: Record<string, unknown> }) {
  const heading = asString(content.heading);
  const items = asFaqItems(content.items);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {heading}
          </h2>
        )}
        <Accordion className="mt-6">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </Accordion>
      </div>
    </section>
  );
}
