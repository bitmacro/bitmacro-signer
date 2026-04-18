"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";

import type { VaultPayload } from "@/lib/vault";
import {
  buildVaultBackupPdfBlob,
  triggerPdfDownload,
  type BackupPdfCopy,
} from "@/lib/backup/generate-backup-pdf";

const ACCENT = "#0066FF";

function generateBackupCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint8Array(6);
  globalThis.crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += chars[buf[i]! % chars.length]!;
  }
  return s;
}

export type VaultBackupGateProps = {
  identityId: string;
  npub: string;
  /** When set (right after vault POST), avoids an extra GET. */
  initialVault: VaultPayload | null;
  onComplete: () => void;
};

export function VaultBackupGate({
  identityId,
  npub,
  initialVault,
  onComplete,
}: VaultBackupGateProps) {
  const t = useTranslations("onboarding.backup");
  const formId = useId();

  const [vault, setVault] = useState<VaultPayload | null>(initialVault);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code] = useState(() => generateBackupCode());
  const [downloaded, setDownloaded] = useState(false);
  const [ackSafeStorage, setAckSafeStorage] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);

  useEffect(() => {
    if (initialVault) {
      setVault(initialVault);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/vault?identity_id=${encodeURIComponent(identityId)}`,
          { credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as {
          blob?: string;
          salt?: string;
          iv?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(j.error ?? t("loadVaultFailed"));
        }
        if (!j.blob || !j.salt || !j.iv) {
          throw new Error(t("loadVaultFailed"));
        }
        if (!cancelled) {
          setVault({ blob: j.blob, salt: j.salt, iv: j.iv });
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t("loadVaultFailed"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identityId, initialVault, t]);

  const pdfCopy: BackupPdfCopy = useMemo(
    () => ({
      fileNamePrefix: t("pdf.fileNamePrefix"),
      title: t("pdf.title"),
      subtitle: t("pdf.subtitle"),
      criticalTitle: t("pdf.criticalTitle"),
      criticalBullets: t("pdf.criticalBullets").split("|"),
      npubLabel: t("pdf.npubLabel"),
      passphraseReminder: t("pdf.passphraseReminder"),
      codeTitle: t("pdf.codeTitle"),
      codeBody: t("pdf.codeBody"),
      downloadCheck: t("pdf.downloadCheck"),
      qrTitle: t("pdf.qrTitle"),
      jsonTitle: t("pdf.jsonTitle"),
      recoveryTitle: t("pdf.recoveryTitle"),
      recoverySteps: t("pdf.recoverySteps").split("|"),
      footer: t("pdf.footer"),
    }),
    [t],
  );

  const handleDownload = useCallback(async () => {
    if (!vault || !npub.trim()) return;
    setBusy(true);
    setGenErr(null);
    try {
      const blob = await buildVaultBackupPdfBlob({
        npub: npub.trim(),
        identityId,
        vault,
        confirmationCode: code,
        copy: pdfCopy,
      });
      const safePrefix = pdfCopy.fileNamePrefix.replace(/[^a-zA-Z0-9._-]/g, "_");
      triggerPdfDownload(blob, `${safePrefix}-${identityId.slice(0, 8)}.pdf`);
      setDownloaded(true);
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : t("pdfGenerationFailed"));
    } finally {
      setBusy(false);
    }
  }, [vault, npub, identityId, code, pdfCopy, t]);

  const codeOk = confirmInput.trim().toLowerCase() === code.toLowerCase();
  const confirmOk = downloaded && ackSafeStorage && codeOk;

  const handleContinue = () => {
    if (!confirmOk) return;
    onComplete();
  };

  if (loadError) {
    return (
      <section
        className="mb-14 rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-red-100"
        role="alert"
      >
        <p className="font-semibold">{t("loadErrorTitle")}</p>
        <p className="mt-2 text-sm">{loadError}</p>
      </section>
    );
  }

  if (!vault) {
    return (
      <section className="mb-14 flex justify-center py-10">
        <Loader2 className="size-10 animate-spin text-zinc-500" aria-hidden />
      </section>
    );
  }

  return (
    <section className="mb-14 scroll-mt-8">
      <div className="mb-5 flex items-center gap-2">
        <AlertTriangle className="size-6 text-amber-400" aria-hidden />
        <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
          {t("sectionTitle")}
        </h2>
      </div>

      <div className="space-y-5 rounded-xl border border-amber-900/40 bg-amber-950/15 p-5 text-base leading-[1.5] text-amber-50">
        <p>{t("intro")}</p>
        <ul className="list-inside list-disc space-y-2 text-sm text-amber-100/95">
          <li>{t("bulletIndependent")}</li>
          <li>{t("bulletPassphrase")}</li>
          <li>{t("bulletStorage")}</li>
          <li>{t("bulletNoCloud")}</li>
        </ul>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="bm-label text-zinc-400">{t("yourNpub")}</p>
        <code className="mt-2 block break-all font-mono text-sm text-zinc-200">
          {npub.trim()}
        </code>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <p className="text-sm font-semibold text-white">{t("codeInstruction")}</p>
        <p
          className="mt-3 text-center font-mono text-3xl font-bold tracking-[0.2em] text-white"
          aria-live="polite"
        >
          {code}
        </p>
        <p className="mt-3 text-sm text-zinc-400">{t("codeHint")}</p>
      </div>

      <div className="mt-6">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDownload()}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {t("downloadPdf")}
        </button>
        {genErr ? (
          <p className="mt-2 text-sm text-red-300" role="alert">
            {genErr}
          </p>
        ) : null}
      </div>

      <form
        id={formId}
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={ackSafeStorage}
            onChange={(e) => setAckSafeStorage(e.target.checked)}
            className="mt-1 size-4 rounded border-zinc-600"
          />
          <span>{t("confirmSafeStorage")}</span>
        </label>

        <div>
          <label htmlFor={`${formId}-confirm`} className="bm-label text-zinc-300">
            {t("confirmTypeCode")}
          </label>
          <input
            id={`${formId}-confirm`}
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value.trim())}
            autoComplete="off"
            className="bm-input mt-2 border-zinc-700 bg-zinc-900/50 font-mono text-lg tracking-widest text-white ring-offset-[#080808] focus:ring-[#0066ff]"
            placeholder={t("confirmPlaceholder")}
            spellCheck={false}
          />
        </div>

        <button
          type="submit"
          disabled={!confirmOk}
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-lg border border-zinc-600 px-4 text-base font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {t("continueAfterBackup")}
        </button>
      </form>
    </section>
  );
}
