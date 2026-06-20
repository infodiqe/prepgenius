"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Mail, Building2 } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
} from "@/components/ui";

/**
 * Public contact page (T37). Frontend only — the form is intentionally inert:
 * there is no backend endpoint, so the submit button is disabled and labelled
 * "Coming Soon". Visitors are pointed to email in the meantime.
 */
export function ContactPage() {
  const t = useTranslations("public_pages.contact");

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        {t("intro")}
      </p>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Direct contact details */}
        <div className="space-y-6">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Mail aria-hidden="true" className="h-5 w-5 text-primary" />
              {t("support_title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("support_email_label")}:{" "}
              <a
                href={`mailto:${t("support_email")}`}
                className="font-medium text-primary hover:underline"
              >
                {t("support_email")}
              </a>
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Building2 aria-hidden="true" className="h-5 w-5 text-primary" />
              {t("business_title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("business_email_label")}:{" "}
              <a
                href={`mailto:${t("business_email")}`}
                className="font-medium text-primary hover:underline"
              >
                {t("business_email")}
              </a>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("business_address_label")}: {t("business_address")}
            </p>
          </section>
        </div>

        {/* Inert contact form (no backend in T37) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("form_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* No action / handler — the form does not submit anywhere yet. */}
            <form className="space-y-4" aria-describedby="contact-form-note">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">{t("form_name_label")}</Label>
                <Input
                  id="contact-name"
                  name="name"
                  placeholder={t("form_name_placeholder")}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">{t("form_email_label")}</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder={t("form_email_placeholder")}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-message">
                  {t("form_message_label")}
                </Label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  placeholder={t("form_message_placeholder")}
                  disabled
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button type="button" className="w-full" disabled>
                {t("form_submit")}
              </Button>
              <p
                id="contact-form-note"
                className="text-xs text-muted-foreground"
              >
                {t("form_note")}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
