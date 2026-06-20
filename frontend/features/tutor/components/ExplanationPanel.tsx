"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Sparkles, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui";
import { TutorComingSoonCard } from "./TutorComingSoonCard";

/*
 * AI Tutor — Explanation Panel shell — Sprint 4 · T30A (frontend-only).
 *
 * A collapsible "Ask AI Tutor" affordance designed to sit alongside a question
 * or result. Expanding it reveals the TutorComingSoonCard — no AI calls, no
 * generated explanations. `questionId` / `questionText` are future-ready props
 * for Sprint 5 (they will scope the tutor request) and are intentionally
 * unused for now.
 */

type ExplanationPanelProps = {
  questionId: string;
  questionText?: string;
};

export function ExplanationPanel(_props: ExplanationPanelProps) {
  const t = useTranslations("tutor");
  const [open, setOpen] = React.useState(false);
  const regionId = React.useId();

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={regionId}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {t("ask_tutor")}
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open && (
        <div id={regionId} role="region" aria-label={t("ask_tutor")}>
          <TutorComingSoonCard />
        </div>
      )}
    </div>
  );
}

export type { ExplanationPanelProps };
