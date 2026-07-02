"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "./card";
import { Button } from "./button";
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "./empty-state";

/*
 * ErrorState — shared "the request failed" surface (SPRINT-5B-01).
 *
 * Built on the existing EmptyState primitives so it matches the design
 * language already used by ReviewErrorState / the readiness-family error cards.
 * Distinct from EmptyState: EmptyState means "the request succeeded but there
 * is no data"; ErrorState means "the request failed" and always offers Retry.
 *
 * Default retry calls `router.refresh()`, which re-runs the server render and
 * refetches data for server-component surfaces (dashboard, practice, analytics,
 * credits, results) without losing client state. Callers driving their own
 * fetch lifecycle can pass an explicit `onRetry`.
 *
 * Copy defaults to the shared `errors` i18n namespace; callers may override.
 */
export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Override the default `router.refresh()` retry (e.g. a client re-fetch). */
  onRetry?: () => void;
  retryLabel?: string;
  /** Heading level so the title fits the surrounding outline. */
  headingLevel?: `h${1 | 2 | 3 | 4 | 5 | 6}`;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  headingLevel = "h2",
}: ErrorStateProps) {
  const t = useTranslations("errors");
  const router = useRouter();
  const handleRetry = onRetry ?? (() => router.refresh());

  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState className="py-10" role="alert">
          <EmptyStateIcon className="bg-destructive/10 text-destructive">
            <AlertCircle />
          </EmptyStateIcon>
          <EmptyStateTitle as={headingLevel}>
            {title ?? t("load_failed_title")}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {description ?? t("server")}
          </EmptyStateDescription>
          <EmptyStateAction>
            <Button type="button" onClick={handleRetry}>
              {retryLabel ?? t("retry")}
            </Button>
          </EmptyStateAction>
        </EmptyState>
      </CardContent>
    </Card>
  );
}
