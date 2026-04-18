"use client";

import { IntlClientProvider } from "@/components/intl-client-provider";
import type { AppLocale } from "@/lib/local-preferences";

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
}) {
  return <IntlClientProvider initialLocale={initialLocale}>{children}</IntlClientProvider>;
}
