"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Brain,
  Target,
  TrendingUp,
  ClipboardCheck,
  Dumbbell,
  LineChart,
  GraduationCap,
  Check,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Accordion,
  AccordionItem,
} from "@/components/ui";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

const BENEFITS = [
  { key: "ai", Icon: Brain },
  { key: "practice", Icon: Target },
  { key: "readiness", Icon: TrendingUp },
] as const;

const STEPS = [
  { key: "step1", Icon: ClipboardCheck },
  { key: "step2", Icon: Dumbbell },
  { key: "step3", Icon: LineChart },
] as const;

const EXAMS = ["ctet", "assam_tet", "regional"] as const;

const PLANS = [
  { key: "free", featured: false },
  { key: "season", featured: true },
  { key: "institution", featured: false },
] as const;

const FAQ_ITEMS = ["q1", "q2", "q3", "q4", "q5"] as const;

function Hero() {
  const t = useTranslations("landing.hero");
  return (
    <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
        <Badge variant="secondary" className="mb-4">
          {t("eyebrow")}
        </Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register">{t("cta_primary")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#features">{t("cta_secondary")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const t = useTranslations("landing.benefits");
  return (
    <section id="features" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {BENEFITS.map(({ key, Icon }) => (
            <Card key={key} className="h-full">
              <CardHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{t(`${key}_title`)}</CardTitle>
                <CardDescription>{t(`${key}_desc`)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("landing.how");
  return (
    <section className="border-t border-border bg-accent/30 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map(({ key, Icon }, index) => (
            <li key={key} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon aria-hidden="true" className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm font-semibold text-primary">
                {t("step_label", { step: index + 1 })}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {t(`${key}_title`)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`${key}_desc`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ExamCoverage() {
  const t = useTranslations("landing.exams");
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {EXAMS.map((exam) => (
            <li key={exam}>
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground">
                <GraduationCap
                  aria-hidden="true"
                  className="h-4 w-4 text-primary"
                />
                {t(exam)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PricingPreview() {
  const t = useTranslations("landing.pricing");
  return (
    <section
      id="pricing"
      className="scroll-mt-16 border-t border-border bg-accent/30 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map(({ key, featured }) => (
            <Card
              key={key}
              className={featured ? "border-primary shadow-md" : "h-full"}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{t(`${key}_title`)}</CardTitle>
                  {featured && <Badge>{t("popular")}</Badge>}
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {t(`${key}_price`)}
                </p>
                <CardDescription>{t(`${key}_desc`)}</CardDescription>
              </CardHeader>
              <CardContent>
                {key === "institution" ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t("coming_soon")}
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant={featured ? "default" : "outline"}
                    className="w-full"
                  >
                    <Link href="/register">{t("cta")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Check aria-hidden="true" className="h-4 w-4 text-primary" />
          {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const t = useTranslations("landing.faq");
  return (
    <section id="faq" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <Accordion className="mt-10">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item}
              question={t(`${item}_q`)}
              answer={t(`${item}_a`)}
            />
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/**
 * Public marketing landing page (T35). Rendered by app/page.tsx only for
 * unauthenticated visitors; authenticated users are redirected to /dashboard
 * before this ever renders.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <Benefits />
        <HowItWorks />
        <ExamCoverage />
        <PricingPreview />
        <Faq />
      </main>
      <PublicFooter />
    </div>
  );
}
