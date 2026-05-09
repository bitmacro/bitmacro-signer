"use client";

import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import {
  Check,
  ChevronDown,
  Copy,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";

import { nostrHexPubkeyToNpub } from "@/lib/session/ttl";

import {
  formatRelativeToNow,
  getSessionStatus,
  truncateHexMiddle,
  type SessionRow,
} from "./session-utils";

function StatusBadge({
  status,
}: {
  status: "pending" | "used" | "expired";
}) {
  const t = useTranslations("sessions");
  const common =
    "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide";
  if (status === "pending") {
    return (
      <span
        className={clsx(
          common,
          "border-amber-500/45 bg-amber-500/12 text-amber-300",
        )}
      >
        {t("statusPending")}
      </span>
    );
  }
  if (status === "used") {
    return (
      <span
        className={clsx(
          common,
          "border-emerald-500/45 bg-emerald-500/10 text-emerald-300",
        )}
      >
        {t("statusUsed")}
      </span>
    );
  }
  return (
    <span
      className={clsx(
        common,
        "border-zinc-600 bg-zinc-800/80 text-zinc-400",
      )}
    >
      {t("statusExpired")}
    </span>
  );
}

export function SessionCard({
  row,
  selected,
  onToggleSelect,
  onRemove,
  removing,
  copiedKey,
  onCopied,
}: {
  row: SessionRow;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  removing: boolean;
  copiedKey: string | null;
  onCopied: (key: string) => void;
}) {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const now = new Date();
  const status = getSessionStatus(row, now.getTime());

  let clientNpub: string | null = null;
  try {
    clientNpub = nostrHexPubkeyToNpub(row.app_pubkey);
  } catch {
    clientNpub = null;
  }

  const kHex = `${row.id}:hex`;
  const kNpub = `${row.id}:npub`;
  const expiresAt = new Date(row.expires_at);
  const relative = formatRelativeToNow(expiresAt, now, locale);

  let summaryLine: string;
  if (status === "used") {
    summaryLine = t("expiryLineUsed");
  } else if (status === "expired") {
    summaryLine = t("expiryLineExpired", { time: relative });
  } else {
    summaryLine = t("expiryLinePending", { time: relative });
  }

  const copyHex = async () => {
    await navigator.clipboard.writeText(row.app_pubkey);
    onCopied(kHex);
  };

  const copyNpub = async () => {
    if (!clientNpub) return;
    await navigator.clipboard.writeText(clientNpub);
    onCopied(kNpub);
  };

  return (
    <li
      className={clsx(
        "group relative rounded-xl border bg-zinc-900/50 transition-colors",
        selected
          ? "border-[#0066FF]/50 ring-1 ring-[#0066FF]/30"
          : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      <div className="flex gap-3 p-4 sm:gap-4">
        <label className="flex shrink-0 cursor-pointer items-start pt-1">
          <input
            type="checkbox"
            className="size-4 rounded border-zinc-600 bg-zinc-950 accent-[#0066FF]"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(row.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("selectSessionAria")}
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2 gap-y-2">
            <div className="flex min-w-0 items-start gap-2">
              <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
                {row.app_name ?? t("noLabel")}
              </h2>
              <span
                className="inline-flex shrink-0 text-zinc-500 hover:text-zinc-300"
                title={t("nameHint")}
              >
                <Info className="size-4" aria-hidden />
                <span className="sr-only">{t("nameHint")}</span>
              </span>
            </div>
            <StatusBadge status={status} />
          </div>

          <p className="mt-2 text-sm text-zinc-400">{summaryLine}</p>

          <details className="group/details mt-3">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-[#0066FF] hover:underline [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 transition-transform group-open/details:rotate-180" />
              {t("detailsToggle")}
            </summary>

            <div className="mt-3 space-y-4 border-t border-zinc-800 pt-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("clientKey")}
                </p>
                {clientNpub ? (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code
                      className="block max-w-full truncate rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-200"
                      title={clientNpub}
                    >
                      {truncateHexMiddle(clientNpub, 16, 14)}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyNpub()}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      {copiedKey === kNpub ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copiedKey === kNpub ? t("copied") : t("copyNpub")}
                    </button>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("hexTechnical")}
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code
                    className="block max-w-full truncate rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-300"
                    title={row.app_pubkey}
                  >
                    {truncateHexMiddle(row.app_pubkey)}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyHex()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                  >
                    {copiedKey === kHex ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copiedKey === kHex ? t("copied") : t("copyHex")}
                  </button>
                </div>
              </div>

              <p className="font-mono text-xs text-zinc-500" title={row.id}>
                {t("sessionIdLabel")}: {row.id}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => onRemove(row.id)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50"
                >
                  {removing ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 shrink-0" />
                  )}
                  {removing ? t("removing") : t("remove")}
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </li>
  );
}
