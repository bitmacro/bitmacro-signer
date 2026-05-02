"use client";

import { useTranslations } from "next-intl";

import { useAppLocale } from "@/components/intl-client-provider";
import type { AppLocale } from "@/lib/local-preferences";

/** Same visible options as id.bitmacro.io (`BitmacroLocaleSwitcher`). */
const OPTIONS: { id: AppLocale; label: string }[] = [
  { id: "pt-BR", label: "PT" },
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
];

export type LocaleSwitcherProps = {
  /** Extra classes on the outer shell */
  className?: string;
  /** Compact chrome for nested contexts (e.g. session dropdown) */
  dense?: boolean;
};

export function LocaleSwitcher({ className, dense }: LocaleSwitcherProps) {
  const t = useTranslations("common");
  const { locale, setLocale } = useAppLocale();

  const shell = dense
    ? "flex gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900/90 p-0.5"
    : "flex gap-0.5 rounded-xl border border-border/90 bg-secondary/80 p-1 shadow-sm backdrop-blur-sm";

  const idle = dense
    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    : "text-muted-foreground hover:bg-secondary hover:text-foreground";

  return (
    <div
      role="group"
      aria-label={t("locale")}
      className={[shell, className].filter(Boolean).join(" ")}
    >
      {OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setLocale(id)}
          aria-pressed={locale === id}
          title={label}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
            locale === id ? "bg-[#F7931A] text-black" : idle
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
