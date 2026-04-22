export const BITMACRO_LOCALE_COOKIE = "bitmacro-locale";

/** @deprecated Read for one-time migration from relay-panel */
export const LEGACY_LOCALE_COOKIE_NAME = "relay-panel:locale";

/** Aligned with relay-panel / bitmacro.io (BCP 47) */
export type AppLocale = "pt-BR" | "en" | "es";

export function parseLocaleCookie(value: string | undefined | null): AppLocale {
  if (value === "en") return "en";
  if (value === "es") return "es";
  if (value === "pt-BR" || value === "pt") return "pt-BR";
  return "pt-BR";
}

/** Prefer proxy (x-bitmacro-locale) header, then unified cookie, then legacy relay-panel cookie */
export function resolveInitialLocale(
  headerLocale: string | null | undefined,
  unifiedCookie: string | undefined | null,
  legacyCookie: string | undefined | null,
): AppLocale {
  if (headerLocale === "pt-BR" || headerLocale === "en" || headerLocale === "es") {
    return headerLocale;
  }
  if (unifiedCookie === "en" || unifiedCookie === "es" || unifiedCookie === "pt-BR") {
    return unifiedCookie;
  }
  if (unifiedCookie === "pt") return "pt-BR";
  if (legacyCookie === "en") return "en";
  if (legacyCookie === "pt") return "pt-BR";
  return "pt-BR";
}
