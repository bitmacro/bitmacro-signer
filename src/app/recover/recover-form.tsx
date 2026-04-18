"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { AlertTriangle, Check, Copy, Loader2 } from "lucide-react";

import { tryParseOfflineVaultBundleJson } from "@/lib/backup/offline-bundle";
import { decryptNsec, VaultDecryptError } from "@/lib/vault";

const ACCENT = "#0066FF";
const CLEAR_MS = 60_000;

export function RecoverForm() {
  const t = useTranslations("recover");
  const formId = useId();
  const [jsonText, setJsonText] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [nsec, setNsec] = useState<string | null>(null);
  const [clearedNotice, setClearedNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!nsec) return;
    const timer = globalThis.setTimeout(() => {
      setNsec(null);
      setClearedNotice(true);
    }, CLEAR_MS);
    return () => globalThis.clearTimeout(timer);
  }, [nsec]);

  useEffect(() => {
    return () => {
      setNsec(null);
    };
  }, []);

  const handleDecrypt = async () => {
    setError(null);
    setClearedNotice(false);
    setNsec(null);
    const parsed = tryParseOfflineVaultBundleJson(jsonText.trim());
    if (!parsed.ok) {
      setError(t("error"));
      return;
    }
    setBusy(true);
    try {
      const out = await decryptNsec(parsed.data.payload, passphrase);
      setNsec(out);
    } catch (e) {
      if (e instanceof VaultDecryptError) {
        setError(t("error"));
      } else {
        setError(t("error"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!nsec) return;
    try {
      await navigator.clipboard.writeText(nsec);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("copyFailed"));
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-400">{t("subtitle")}</p>
      </div>

      {clearedNotice && !nsec ? (
        <p
          className="mb-6 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
          role="status"
        >
          {t("cleared")}
        </p>
      ) : null}

      <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div>
          <label htmlFor={`${formId}-json`} className="bm-label text-zinc-400">
            {t("jsonLabel")}
          </label>
          <textarea
            id={`${formId}-json`}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            rows={8}
            autoComplete="off"
            spellCheck={false}
            className="bm-input mt-2 min-h-[160px] w-full resize-y border-zinc-700 bg-zinc-900/50 font-mono text-sm text-zinc-100"
            placeholder={t("jsonPlaceholder")}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-pass`} className="bm-label text-zinc-400">
            {t("passphraseLabel")}
          </label>
          <input
            id={`${formId}-pass`}
            type="password"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
              setError(null);
            }}
            autoComplete="off"
            className="bm-input mt-2 border-zinc-700 bg-zinc-900/50 text-zinc-100"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDecrypt()}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {busy ? t("decrypting") : t("decrypt")}
        </button>
      </div>

      {nsec ? (
        <section
          className="mt-8 space-y-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-6"
          aria-live="polite"
        >
          <div className="flex gap-2">
            <AlertTriangle className="size-5 shrink-0 text-amber-400" aria-hidden />
            <div>
              <p className="font-semibold text-amber-100">{t("warningTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-100/90">
                {t("warningBody")}
              </p>
            </div>
          </div>

          <div>
            <p className="bm-label text-zinc-400">nsec</p>
            <code className="mt-2 block break-all rounded-lg border border-zinc-700 bg-zinc-900/80 p-3 font-mono text-sm text-zinc-100">
              {nsec}
            </code>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              {copied ? (
                <Check className="size-4 text-emerald-400" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? t("copied") : t("copy")}
            </button>
            <p className="text-sm text-zinc-400">{t("importHint")}</p>
          </div>

          <p className="text-xs text-zinc-500">{t("autoClear")}</p>
        </section>
      ) : null}

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="text-primary underline-offset-2 hover:underline">
          {t("navHome")}
        </Link>
      </p>
    </div>
  );
}
