"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignerBuildStamp } from "@/components/signer-build-stamp";
import { nostrHexPubkeyToNpub } from "@/lib/session/ttl";

const ACCENT = "#0066FF";
const BG = "#080808";

function truncateHexMiddle(hex: string, head = 14, tail = 12): string {
  const t = hex.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

type SessionRow = {
  id: string;
  vault_id: string;
  app_pubkey: string;
  app_name: string | null;
  used: boolean;
  expires_at: string;
  created_at: string;
};

function SessionCard({
  row,
  copiedKey,
  onCopied,
  onRemove,
  removing,
}: {
  row: SessionRow;
  copiedKey: string | null;
  onCopied: (key: string) => void;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const t = useTranslations("sessions");
  let clientNpub: string | null = null;
  try {
    clientNpub = nostrHexPubkeyToNpub(row.app_pubkey);
  } catch {
    clientNpub = null;
  }

  const kHex = `${row.id}:hex`;
  const kNpub = `${row.id}:npub`;

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
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-base">
      {row.app_name ? (
        <p className="text-lg font-semibold leading-snug text-white">{row.app_name}</p>
      ) : (
        <p className="text-base leading-[1.5] text-zinc-400">{t("noLabel")}</p>
      )}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {t("clientKey")}
      </p>
      {clientNpub ? (
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
          <code
            className="flex min-h-12 flex-1 items-center break-all rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-sm leading-normal text-zinc-200"
            title={clientNpub}
          >
            {truncateHexMiddle(clientNpub, 18, 16)}
          </code>
          <button
            type="button"
            onClick={() => void copyNpub()}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            {copiedKey === kNpub ? (
              <Check className="size-4 text-emerald-400" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copiedKey === kNpub ? t("copied") : t("copyNpub")}
          </button>
        </div>
      ) : null}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {t("hexTechnical")}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
        <code
          className="flex min-h-12 flex-1 items-center break-all rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-sm leading-normal text-zinc-300"
          title={row.app_pubkey}
        >
          {truncateHexMiddle(row.app_pubkey)}
        </code>
        <button
          type="button"
          onClick={() => void copyHex()}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
        >
          {copiedKey === kHex ? (
            <Check className="size-4 text-emerald-400" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copiedKey === kHex ? t("copied") : t("copyHex")}
        </button>
      </div>
      <p className="mt-3 font-mono text-xs text-zinc-500" title={row.id}>
        {t("sessionIdLabel")}: {row.id}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm leading-[1.5] text-zinc-400">
        <span>
          {t("expires")} {new Date(row.expires_at).toLocaleString()}{" "}
          {row.used ? `· ${t("used")}` : `· ${t("pending")}`}
        </span>
        <button
          type="button"
          disabled={removing}
          onClick={() => onRemove(row.id)}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50"
        >
          {removing ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-4 shrink-0" aria-hidden />
          )}
          {removing ? t("removing") : t("remove")}
        </button>
      </div>
    </li>
  );
}

export default function SessionsPage() {
  const t = useTranslations("sessions");
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const st = await fetch("/api/auth/status", { credentials: "include" });
      if (!st.ok) {
        setIdentityId(null);
        setRows(null);
        setError(t("sessionRequired"));
        return;
      }
      const { identity_id } = (await st.json()) as { identity_id: string };
      setIdentityId(identity_id);

      const res = await fetch(
        `/api/sessions?identity_id=${encodeURIComponent(identity_id)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? t("listError"));
      }
      const data = (await res.json()) as SessionRow[];
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemove = useCallback(
    async (sessionId: string) => {
      if (!window.confirm(t("removeConfirm"))) {
        return;
      }
      setRemoveError(null);
      setRemovingId(sessionId);
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}`,
          { method: "DELETE", credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(j.error ?? t("removeError"));
        }
        await load();
      } catch (e) {
        setRemoveError(e instanceof Error ? e.message : t("removeError"));
      } finally {
        setRemovingId(null);
      }
    },
    [load, t],
  );

  return (
    <div
      className="min-h-screen text-zinc-200 antialiased"
      style={{ backgroundColor: BG }}
    >
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <header className="mb-10 border-b border-zinc-800 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">{t("brand")}</p>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
              <SignerBuildStamp variant="compact" />
              <LocaleSwitcher />
            </div>
          </div>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw+0.85rem,1.875rem)] font-bold leading-tight text-white">
            {t("title")}
          </h1>
          {identityId ? (
            <p className="mt-3 break-all font-mono text-sm text-zinc-400">{identityId}</p>
          ) : null}
          <p className="mt-4 max-w-2xl text-base leading-[1.5] text-zinc-300">{t("body")}</p>
        </header>

        {loading ? (
          <div className="flex min-h-12 items-center gap-3 text-base text-zinc-300">
            <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            {t("loading")}
          </div>
        ) : null}

        {removeError ? (
          <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-base leading-[1.5] text-red-100">
            {removeError}
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-base leading-[1.5] text-amber-100">
            {error}{" "}
            <Link
              href="/panel"
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: ACCENT }}
            >
              {t("onboardingLink")}
            </Link>
          </div>
        ) : null}

        {rows && rows.length === 0 ? (
          <p className="text-base leading-[1.5] text-zinc-400">{t("empty")}</p>
        ) : null}

        {rows && rows.length > 0 ? (
          <ul className="space-y-4">
            {rows.map((r) => (
              <SessionCard
                key={r.id}
                row={r}
                copiedKey={copiedKey}
                onCopied={(key) => {
                  setCopiedKey(key);
                  window.setTimeout(() => setCopiedKey(null), 2000);
                }}
                onRemove={handleRemove}
                removing={removingId === r.id}
              />
            ))}
          </ul>
        ) : null}

        <p className="mt-12 text-base leading-[1.5]">
          <Link
            href="/panel"
            className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline"
            style={{ color: ACCENT }}
          >
            {t("back")}
          </Link>
        </p>
      </div>
    </div>
  );
}
