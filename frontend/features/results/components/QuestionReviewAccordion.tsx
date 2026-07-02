"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Check, X, HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OptionItem {
  id: string;
  label: string;
  body: string;
  is_correct: boolean;
  position: number;
}

interface QuestionDetails {
  id: string;
  stem: string;
  explanation: string | null;
  difficulty: number;
  options: OptionItem[];
}

interface UserAnswerDetails {
  id: string;
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean;
  time_spent_seconds: number;
}

interface QuestionReviewItem {
  userAnswer: UserAnswerDetails;
  question: QuestionDetails;
}

interface QuestionReviewAccordionProps {
  items: QuestionReviewItem[];
}

export default function QuestionReviewAccordion({
  items,
}: QuestionReviewAccordionProps) {
  const t = useTranslations("results");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground tracking-tight">
        {t("questions_review")}
      </h3>

      {items.length === 0 ? (
        <div className="text-center p-8 border border-border rounded-xl bg-card text-muted-foreground">
          {t("no_questions")}
        </div>
      ) : (
        items.map((item, idx) => {
          const { userAnswer, question } = item;
          const isOpen = !!openIds[question.id];
          const isCorrect = userAnswer.is_correct;
          const selectedOptionId = userAnswer.selected_option_id;

          return (
            <div
              key={question.id}
              className={cn(
                "border rounded-xl bg-card backdrop-blur-md overflow-hidden transition-colors duration-200",
                isOpen ? "border-border" : "border-border hover:border-border"
              )}
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleOpen(question.id)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-accent"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 pr-4">
                  <span className="text-xs font-bold px-2 py-1 rounded bg-muted text-muted-foreground uppercase">
                    Q{idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-foreground truncate max-w-[200px] md:max-w-xl">
                    {question.stem}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                      isCorrect
                        ? "bg-green-500/10 text-green-400"
                        : selectedOptionId
                        ? "bg-red-500/10 text-red-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCorrect ? t("correct") : selectedOptionId ? t("incorrect") : t("skipped")}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {isOpen && (
                <div className="p-5 border-t border-border bg-muted space-y-6">
                  {/* Stem */}
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    {question.stem}
                  </p>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((opt) => {
                      const isOptionSelected = selectedOptionId === opt.id;
                      const isOptionCorrect = opt.is_correct;

                      let borderClass = "border-border bg-muted hover:border-border";
                      let iconColor = "text-muted-foreground";
                      let renderIcon = null;

                      if (isOptionCorrect) {
                        borderClass = "border-green-500/40 bg-green-500/5 text-green-400";
                        iconColor = "text-green-400";
                        renderIcon = <Check className="h-4 w-4 shrink-0" />;
                      } else if (isOptionSelected && !isOptionCorrect) {
                        borderClass = "border-red-500/40 bg-red-500/5 text-red-400";
                        iconColor = "text-red-400";
                        renderIcon = <X className="h-4 w-4 shrink-0" />;
                      }

                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-xl border text-sm transition-all duration-200",
                            borderClass
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold uppercase",
                              isOptionCorrect
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : isOptionSelected
                                ? "border-red-500/30 bg-red-500/10 text-red-400"
                                : "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            {opt.label}
                          </span>
                          <span className="flex-1 text-muted-foreground">{opt.body}</span>
                          {renderIcon}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 space-y-1">
                      <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">
                        {t("explanation")}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  )}

                  {/* Tutor CTA */}
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-muted-foreground flex items-center gap-1.5 cursor-not-allowed"
                      disabled
                    >
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <span>{t("ask_tutor")}</span>
                      <span className="text-[9px] uppercase font-bold bg-muted text-purple-400 px-1.5 py-0.5 rounded">
                        {t("coming_soon")}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
