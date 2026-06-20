"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Accordion,
  AccordionItem,
} from "@/components/ui";

// Plan definitions are data, not markup — feature keys map to i18n strings.
const PLANS = [
  {
    key: "free",
    featured: true,
    comingSoon: false,
    features: [
      "practice",
      "topic",
      "subject",
      "pyq",
      "dashboard",
      "readiness",
      "mastery",
      "history",
    ],
  },
  {
    key: "premium",
    featured: false,
    comingSoon: true,
    features: ["tutor", "explanations", "recommendations", "analytics", "paths"],
  },
  {
    key: "institute",
    featured: false,
    comingSoon: true,
    features: ["batch", "reporting", "monitoring", "instructor"],
  },
] as const;

const FAQ_ITEMS = ["q1", "q2", "q3", "q4"] as const;

/**
 * Public pricing marketing page (T38). No checkout, no payment APIs — the
 * premium/institute plans are labelled "Coming Soon" and the only action is to
 * register for the free tier.
 */
export function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("hero_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("hero_subtitle")}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/register">{t("hero_cta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.key}
                className={
                  plan.featured
                    ? "flex flex-col border-primary shadow-md"
                    : "flex flex-col"
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl">
                      {t(`${plan.key}_label`)}
                    </CardTitle>
                    {plan.comingSoon && (
                      <Badge variant="secondary">{t("coming_soon")}</Badge>
                    )}
                  </div>
                  {plan.key === "free" && (
                    <p className="text-3xl font-bold text-foreground">
                      {t("free_price")}
                    </p>
                  )}
                  <CardDescription>{t(`${plan.key}_desc`)}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        />
                        <span>{t(`${plan.key}_feature_${feature}`)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {plan.comingSoon ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t("coming_soon")}
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href="/register">{t("free_cta")}</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-accent/30 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {t("faq_title")}
          </h2>
          <Accordion className="mt-10">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem
                key={item}
                question={t(`faq_${item}_q`)}
                answer={t(`faq_${item}_a`)}
              />
            ))}
          </Accordion>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {t("cta_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("cta_subtitle")}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/register">{t("cta_button")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
