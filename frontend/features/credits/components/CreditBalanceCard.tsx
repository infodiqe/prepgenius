import React from "react";
import { getTranslations } from "next-intl/server";
import { Coins, Lock, TrendingUp, AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import type { CreditSummary } from "../creditService";

/**
 * CreditBalanceCard — learner-facing credit balance (SPRINT-5A-04/05).
 *
 * Server component. Renders the three exact decimal strings returned by
 * GET /credits/balance/ verbatim — no client-side math, no fabricated values.
 * A learner with no balance row reads as all-zero (the backend's true starting
 * position; AI credits are a premium feature per PRD v4 §5.2).
 */
export async function CreditBalanceCard({
  summary,
}: {
  summary: CreditSummary | null;
}) {
  const t = await getTranslations("credits");

  if (summary === null) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{t("load_error")}</span>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      key: "available",
      label: t("available_label"),
      value: summary.available,
      hint: t("available_hint"),
      icon: Coins,
      iconClass: "text-emerald-500",
      emphasis: true,
    },
    {
      key: "reserved",
      label: t("reserved_label"),
      value: summary.reserved,
      hint: t("reserved_hint"),
      icon: Lock,
      iconClass: "text-amber-500",
      emphasis: false,
    },
    {
      key: "lifetime",
      label: t("lifetime_label"),
      value: summary.lifetime,
      hint: t("lifetime_hint"),
      icon: TrendingUp,
      iconClass: "text-blue-500",
      emphasis: false,
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ key, label, value, hint, icon: Icon, iconClass, emphasis }) => (
          <Card key={key} className="border-border bg-card">
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
              </div>
              <p
                className={
                  emphasis
                    ? "font-mono text-3xl font-bold tabular-nums text-foreground"
                    : "font-mono text-2xl font-semibold tabular-nums text-foreground"
                }
              >
                {value}
              </p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{t("premium_note")}</p>
    </div>
  );
}
