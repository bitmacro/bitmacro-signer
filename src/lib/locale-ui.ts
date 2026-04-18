import type { AppLocale } from "@/lib/local-preferences";

const ORDER: AppLocale[] = ["pt-BR", "en", "es"];

export function nextLocale(current: AppLocale): AppLocale {
  const i = ORDER.indexOf(current);
  return ORDER[i === -1 ? 0 : (i + 1) % ORDER.length];
}

/** Short label for compact buttons (PT / EN / ES) */
export function localeShortLabel(locale: AppLocale): string {
  switch (locale) {
    case "pt-BR":
      return "PT";
    case "en":
      return "EN";
    case "es":
      return "ES";
  }
}

/** `lang` on `<html>` (BCP 47) */
export function htmlLangAttribute(locale: AppLocale): string {
  switch (locale) {
    case "pt-BR":
      return "pt-BR";
    case "en":
      return "en";
    case "es":
      return "es";
  }
}
