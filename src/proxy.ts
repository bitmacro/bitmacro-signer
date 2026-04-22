import { type NextRequest, NextResponse } from "next/server";

import {
  BITMACRO_LOCALE_COOKIE,
  LEGACY_LOCALE_COOKIE_NAME,
  type AppLocale,
} from "@/lib/local-preferences";

function isAppLocale(value: string | undefined): value is AppLocale {
  return value === "pt-BR" || value === "en" || value === "es";
}

function localeFromAcceptLanguage(header: string | null): AppLocale {
  if (!header) return "pt-BR";
  const segments = header
    .toLowerCase()
    .split(",")
    .map((part) => part.trim().split(";")[0]!.trim());
  for (const seg of segments) {
    if (seg.startsWith("pt")) return "pt-BR";
    if (seg.startsWith("es")) return "es";
    if (seg.startsWith("en")) return "en";
  }
  return "pt-BR";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const unified = request.cookies.get(BITMACRO_LOCALE_COOKIE)?.value;
  const legacy = request.cookies.get(LEGACY_LOCALE_COOKIE_NAME)?.value;

  let locale: AppLocale = "pt-BR";
  let setCookie = false;

  if (isAppLocale(unified)) {
    locale = unified;
  } else if (legacy === "en") {
    locale = "en";
    setCookie = true;
  } else if (legacy === "pt") {
    locale = "pt-BR";
    setCookie = true;
  } else {
    locale = localeFromAcceptLanguage(request.headers.get("accept-language"));
    setCookie = true;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-bitmacro-locale", locale);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (setCookie) {
    response.cookies.set(BITMACRO_LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
