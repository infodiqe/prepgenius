"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import {
  Card,
  CardContent,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";

/**
 * T04 empty state for the Review Board. Title is a real heading (default <h2>)
 * for screen-reader structure; the icon is decorative.
 */
export function ReviewEmptyState({
  title,
  description,
  headingLevel = "h2",
}: {
  title: string;
  description: string;
  headingLevel?: `h${1 | 2 | 3 | 4 | 5 | 6}`;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState className="py-10">
          <EmptyStateIcon>
            <Inbox />
          </EmptyStateIcon>
          <EmptyStateTitle as={headingLevel}>{title}</EmptyStateTitle>
          <EmptyStateDescription>{description}</EmptyStateDescription>
        </EmptyState>
      </CardContent>
    </Card>
  );
}
