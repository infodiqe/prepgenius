"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  MessageCircleQuestion,
  Lightbulb,
  Languages,
  MessagesSquare,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui";

/*
 * AI Tutor — Coming Soon Card — Sprint 4 · T30A (frontend-only shell).
 *
 * Communicates that the AI Tutor is not yet available and previews the
 * capabilities it will offer once Sprint 5 wires in the backend. This is a
 * pure presentational shell: no AI calls, no fake responses, no history.
 */

const CAPABILITIES: ReadonlyArray<{
  key: "explain_answers" | "explain_concepts" | "translate_explanations" | "follow_up_questions";
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "explain_answers", Icon: MessageCircleQuestion },
  { key: "explain_concepts", Icon: Lightbulb },
  { key: "translate_explanations", Icon: Languages },
  { key: "follow_up_questions", Icon: MessagesSquare },
];

export function TutorComingSoonCard() {
  const t = useTranslations("tutor");
  const headingId = React.useId();
  const capsId = React.useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:h-6 [&_svg]:w-6"
          >
            <Sparkles />
          </span>
          <h2
            id={headingId}
            className="text-lg font-semibold text-foreground"
          >
            {t("coming_soon_title")}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("coming_soon_description")}
          </p>
        </div>

        <div className="space-y-3">
          <h3
            id={capsId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("future_capabilities")}
          </h3>
          <ul aria-labelledby={capsId} className="grid gap-2 sm:grid-cols-2">
            {CAPABILITIES.map(({ key, Icon }) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2.5 text-sm text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
