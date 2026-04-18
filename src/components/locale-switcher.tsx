"use client";

import { useTranslations } from "next-intl";

import { useAppLocale } from "@/components/intl-client-provider";
import { localeShortLabel, nextLocale } from "@/lib/locale-ui";

type LocaleSwitcherProps = {
  /** Extra class for the trigger button */
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations("common");
  const { locale, setLocale } = useAppLocale();

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale(locale))}
      title={t("locale")}
      className={
        className ??
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
      }
    >
      {localeShortLabel(locale)}
    </button>
  );
}
