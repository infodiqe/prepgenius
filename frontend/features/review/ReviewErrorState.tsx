"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "@/components/ui";

/**
 * T02 error state for the Review Board, with a retry button.
 */
export function ReviewErrorState({
  title,
  description,
  onRetry,
  headingLevel = "h2",
}: {
  title: string;
  description: string;
  onRetry: () => void;
  headingLevel?: `h${1 | 2 | 3 | 4 | 5 | 6}`;
}) {
  const t = useTranslations("review");
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState className="py-10">
          <EmptyStateIcon className="bg-destructive/10 text-destructive">
            <AlertCircle />
          </EmptyStateIcon>
          <EmptyStateTitle as={headingLevel}>{title}</EmptyStateTitle>
          <EmptyStateDescription>{description}</EmptyStateDescription>
          <EmptyStateAction>
            <Button type="button" onClick={onRetry}>
              {t("retry")}
            </Button>
          </EmptyStateAction>
        </EmptyState>
      </CardContent>
    </Card>
  );
}
