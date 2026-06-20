"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Mail } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Label,
  Accordion,
  AccordionItem,
} from "@/components/ui";

const HERO_BENEFITS = ["benefit_1", "benefit_2", "benefit_3"] as const;
const INTEREST_OPTIONS = ["student", "teacher", "institute"] as const;
const FAQ_ITEMS = ["q1", "q2", "q3", "q4"] as const;

/**
 * Public waitlist / lead-capture page (T39). Frontend only — there is no
 * backend, no database, and no local storage. Forms are intentionally inert:
 * inputs are disabled and submit buttons show "Coming Soon". No fake success is
 * ever shown. Visitors are routed to email for genuine early-access requests.
 */
export function WaitlistPage() {
  const t = useTranslations("waitlist");

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <Badge variant="secondary" className="mb-4">
            {t("hero_badge")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("hero_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("hero_subtitle")}
          </p>
          <ul className="mx-auto mt-8 flex max-w-xl flex-col gap-2 text-left">
            {HERO_BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                <span>{t(`hero_${benefit}`)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button asChild size="lg">
              <a href="#join">{t("hero_cta")}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Join waitlist + side panels */}
      <section id="join" className="scroll-mt-16 py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          {/* Waitlist form (inert) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t("form_title")}</CardTitle>
              <CardDescription>{t("form_subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* No action / handler — the form does not submit anywhere. */}
              <form className="space-y-4" aria-describedby="waitlist-note">
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-name">{t("name_label")}</Label>
                  <Input
                    id="waitlist-name"
                    name="name"
                    placeholder={t("name_placeholder")}
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-email">{t("email_label")}</Label>
                  <Input
                    id="waitlist-email"
                    name="email"
                    type="email"
                    placeholder={t("email_placeholder")}
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waitlist-interest">{t("interest_label")}</Label>
                  <select
                    id="waitlist-interest"
                    name="interest"
                    disabled
                    defaultValue=""
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>
                      {t("interest_placeholder")}
                    </option>
                    {INTEREST_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`interest_${option}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button type="button" className="w-full" disabled>
                {t("coming_soon")}
              </Button>
              <p id="waitlist-note" className="text-xs text-muted-foreground">
                {t("form_note")}
              </p>
            </CardFooter>
          </Card>

          {/* Contact sales + newsletter */}
          <div className="flex flex-col gap-8">
            {/* Contact sales (institutions) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Mail aria-hidden="true" className="h-5 w-5 text-primary" />
                  {t("sales_title")}
                </CardTitle>
                <CardDescription>{t("sales_body")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${t("sales_email")}`}>{t("sales_cta")}</a>
                </Button>
              </CardContent>
            </Card>

            {/* Newsletter (inert) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{t("newsletter_title")}</CardTitle>
                <CardDescription>{t("newsletter_subtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" aria-describedby="newsletter-note">
                  <div className="space-y-1.5">
                    <Label htmlFor="newsletter-email">
                      {t("newsletter_email_label")}
                    </Label>
                    <Input
                      id="newsletter-email"
                      name="newsletter-email"
                      type="email"
                      placeholder={t("newsletter_email_placeholder")}
                      disabled
                    />
                  </div>
                  <Button type="button" className="w-full" disabled>
                    {t("coming_soon")}
                  </Button>
                  <p
                    id="newsletter-note"
                    className="text-xs text-muted-foreground"
                  >
                    {t("newsletter_note")}
                  </p>
                </form>
              </CardContent>
            </Card>
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
    </div>
  );
}
