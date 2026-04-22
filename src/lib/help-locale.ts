import {
  BITMACRO_LOCALE_COOKIE,
  type AppLocale,
} from "@/lib/local-preferences";

export type HelpLocale = AppLocale;

export function normalizeHelpLocale(raw: unknown): HelpLocale {
  if (raw === "pt-BR" || raw === "en" || raw === "es") return raw;
  return "pt-BR";
}

export function getHelpLocaleFromCookieHeader(
  cookieHeader: string | null,
): HelpLocale {
  if (!cookieHeader) return "pt-BR";
  const parts = cookieHeader.split(";").map((c) => c.trim());
  for (const p of parts) {
    if (p.startsWith(`${BITMACRO_LOCALE_COOKIE}=`)) {
      const v = decodeURIComponent(p.slice(BITMACRO_LOCALE_COOKIE.length + 1));
      return normalizeHelpLocale(v);
    }
  }
  return "pt-BR";
}
