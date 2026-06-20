"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MessagesSquare, SendHorizonal } from "lucide-react";

import {
  Card,
  CardContent,
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { TutorComingSoonCard } from "./TutorComingSoonCard";

/*
 * AI Tutor — Chat Panel shell — Sprint 4 · T30A (frontend-only).
 *
 * The full conversational workspace shell ahead of Sprint 5 backend wiring.
 * Backend is the source of truth: this renders an empty, fully-disabled
 * workspace. There is NO conversation history, NO local persistence, NO
 * simulated streaming, and NO AI calls. The composer (language select, text
 * input, send button) is rendered disabled to preview the future layout.
 *
 * `contextType` / `contextId` are deliberately future-ready props for Sprint 5
 * (e.g. asking about a specific question or result). They are intentionally
 * unused for now.
 */

type TutorChatPanelProps = {
  contextType?: "question" | "result" | "general";
  contextId?: string;
};

const LANGUAGES: ReadonlyArray<{ value: string; key: "lang_as" | "lang_en" | "lang_hi" }> = [
  { value: "as", key: "lang_as" },
  { value: "en", key: "lang_en" },
  { value: "hi", key: "lang_hi" },
];

export function TutorChatPanel(_props: TutorChatPanelProps) {
  const t = useTranslations("tutor");
  const headingId = React.useId();
  const languageId = React.useId();
  const inputId = React.useId();

  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1
            id={headingId}
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={languageId}>{t("language")}</Label>
          <Select defaultValue="as" disabled>
            <SelectTrigger
              id={languageId}
              aria-label={t("language")}
              className="sm:w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(({ value, key }) => (
                <SelectItem key={value} value={value}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Coming-soon messaging */}
      <TutorComingSoonCard />

      {/* Empty conversation workspace — NO history is shown or implied. */}
      <Card>
        <CardContent className="p-0">
          <div
            role="log"
            aria-label={t("history_placeholder")}
            aria-live="off"
            className="flex min-h-[14rem] flex-col items-center justify-center gap-3 px-6 py-12 text-center"
          >
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:h-6 [&_svg]:w-6"
            >
              <MessagesSquare />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("history_placeholder")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disabled composer — previews the future input, fully inert. */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor={inputId} className="sr-only">
            {t("input_placeholder")}
          </Label>
          <textarea
            id={inputId}
            rows={2}
            disabled
            aria-disabled="true"
            placeholder={t("input_placeholder")}
            className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button
          type="button"
          size="icon"
          disabled
          aria-disabled="true"
          aria-label={t("send")}
        >
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

export type { TutorChatPanelProps };
