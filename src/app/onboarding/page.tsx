"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Radio,
  Shield,
} from "lucide-react";
import { getPublicKey } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignerBuildStamp } from "@/components/signer-build-stamp";
import { VaultBackupGate } from "@/components/vault-backup-gate";
import { nostrPubkeyInputToHex } from "@/lib/session/ttl";
import type { VaultPayload } from "@/lib/vault";
import { generateKeypair, encryptNsec } from "@/lib/vault";

const BG = "#080808";
const ACCENT = "#0066FF";

type UnlockOk = {
  ok: true;
  vault_exists: boolean;
  identity_id: string;
  is_running: boolean;
};

type Phase = 1 | 2 | 3;
type Step1Path = "have_npub" | "fresh_npub";

type SessionPreviewRow = {
  id: string;
  app_name: string | null;
  used: boolean;
  expires_at: string;
};

function truncateMiddle(s: string, keep = 14): string {
  if (s.length <= keep * 2 + 3) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tSess = useTranslations("sessions");

  const parseUnlockError = useCallback(
    async (res: Response): Promise<string> => {
      if (res.status === 401) return t("errors.incorrectPassphrase");
      if (res.status === 404) return t("errors.npubNotRegistered");
      try {
        const j = (await res.json()) as { error?: string };
        if (j.error) return j.error;
      } catch {
        /* ignore */
      }
      return t("errors.unlockFailed");
    },
    [t],
  );

  const [phase, setPhase] = useState<Phase>(1);

  const [step1Path, setStep1Path] = useState<Step1Path>("have_npub");

  const [npubInput, setNpubInput] = useState("");
  const [passphraseStep1, setPassphraseStep1] = useState("");

  const [identityId, setIdentityId] = useState("");

  const vaultNsecRef = useRef<string | null>(null);

  const [nsecImport, setNsecImport] = useState("");
  const [npubDisplay, setNpubDisplay] = useState("");
  const [encryptPassword, setEncryptPassword] = useState("");

  const [bunkerUri, setBunkerUri] = useState<string | null>(null);
  /** Human-readable label for this connection (stored as app_name; NIP-46 does not send the app name). */
  const [sessionLabel, setSessionLabel] = useState("");
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusIdentity, setStatusIdentity] = useState<string | null>(null);
  const [statusRunning, setStatusRunning] = useState<boolean | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionRows, setSessionRows] = useState<SessionPreviewRow[] | null>(
    null,
  );
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [needsVaultBackup, setNeedsVaultBackup] = useState(false);
  const [backupVaultPayload, setBackupVaultPayload] =
    useState<VaultPayload | null>(null);

  const refreshSessions = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(
        `/api/sessions?identity_id=${encodeURIComponent(id)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setSessionRows([]);
        return;
      }
      const data = (await res.json()) as SessionPreviewRow[];
      setSessionRows(data);
    } catch {
      setSessionRows([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status", { credentials: "include" });
      if (!res.ok) {
        setStatusIdentity(null);
        setStatusRunning(null);
        setPhase(1);
        setSessionRows(null);
        return;
      }
      const j = (await res.json()) as {
        identity_id: string;
        is_running: boolean;
        vault_exists?: boolean;
      };
      setStatusIdentity(j.identity_id);
      setStatusRunning(j.is_running);
      setIdentityId(j.identity_id);
      if (j.vault_exists === false) {
        setPhase(2);
      } else {
        setPhase(3);
      }
      if (typeof window !== "undefined" && j.vault_exists) {
        const pending = sessionStorage.getItem("bm_signer_backup_pending");
        const ok = sessionStorage.getItem(
          `bm_signer_backup_ok_${j.identity_id}`,
        );
        if (pending === j.identity_id && !ok) {
          setNeedsVaultBackup(true);
        }
      }
      void refreshSessions(j.identity_id);
    } catch {
      setStatusIdentity(null);
      setStatusRunning(null);
      setPhase(1);
      setSessionRows(null);
    } finally {
      setAuthChecked(true);
    }
  }, [refreshSessions]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const completeVaultBackup = useCallback(() => {
    const id = identityId.trim();
    if (id) {
      sessionStorage.removeItem("bm_signer_backup_pending");
      sessionStorage.setItem(`bm_signer_backup_ok_${id}`, "1");
    }
    setNeedsVaultBackup(false);
    setBackupVaultPayload(null);
    void refreshSessions(id);
  }, [identityId, refreshSessions]);

  const ensureFreshKeypair = useCallback(() => {
    if (vaultNsecRef.current) return;
    const { nsec, npub } = generateKeypair();
    vaultNsecRef.current = nsec;
    setNpubDisplay(npub);
    setEncryptPassword("");
  }, []);

  const createSessionAndQr = useCallback(async (
    id: string,
    clientPubkeyRaw?: string,
  ) => {
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      identity_id: id,
    };
    const label = sessionLabel.trim();
    if (label) {
      body.app_name = label;
    }
    if (clientPubkeyRaw?.trim()) {
      try {
        body.app_pubkey = nostrPubkeyInputToHex(clientPubkeyRaw.trim());
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.invalidClientPubkey"));
        setLoading(false);
        return;
      }
    }
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        bunker_uri?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? t("errors.couldNotCreateSession"));
      }
      if (!data.bunker_uri) {
        throw new Error(t("errors.missingBunkerUri"));
      }
      setBunkerUri(data.bunker_uri);
      setPhase(3);
      void refreshSessions(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }, [sessionLabel, t, refreshSessions]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npub: npubInput.trim(),
          passphrase: passphraseStep1,
        }),
      });

      if (!res.ok) {
        throw new Error(await parseUnlockError(res));
      }

      const data = (await res.json()) as UnlockOk;
      setIdentityId(data.identity_id);

      await refreshStatus();

      if (!data.vault_exists) {
        setNsecImport("");
        setEncryptPassword("");
        setPhase(2);
        return;
      }

      setBunkerUri(null);
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleFreshCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const npub = npubDisplay.trim();
    const nsecRef = vaultNsecRef.current;
    if (!npub || !nsecRef) {
      setError(t("errors.generateOrReload"));
      return;
    }
    if (!encryptPassword) {
      setError(t("errors.enterPassphrase"));
      return;
    }

    setLoading(true);
    try {
      const bootRes = await fetch("/api/identities/bootstrap", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub }),
      });
      const bootJson = (await bootRes.json().catch(() => ({}))) as {
        identity_id?: string;
        error?: string;
      };
      if (!bootRes.ok) {
        throw new Error(bootJson.error ?? t("errors.couldNotCreateIdentity"));
      }
      const id = bootJson.identity_id?.trim();
      if (!id) {
        throw new Error(t("errors.missingIdentityId"));
      }
      setIdentityId(id);

      const payload = await encryptNsec(nsecRef, encryptPassword);
      vaultNsecRef.current = null;

      const vaultRes = await fetch("/api/vault", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_id: id,
          blob: payload.blob,
          salt: payload.salt,
          iv: payload.iv,
          bunker_pubkey: npub,
        }),
      });
      const vJson = (await vaultRes.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!vaultRes.ok) {
        throw new Error(vJson.error ?? t("errors.saveVaultFailed"));
      }

      const unlockRes = await fetch("/api/auth/unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npub,
          passphrase: encryptPassword,
        }),
      });
      if (!unlockRes.ok) {
        throw new Error(await parseUnlockError(unlockRes));
      }
      sessionStorage.setItem("bm_signer_backup_pending", id);
      setBackupVaultPayload(payload);
      setNeedsVaultBackup(true);
      await refreshStatus();
      setBunkerUri(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2ImportVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = identityId.trim();
    if (!id) {
      setError(t("errors.missingIdentityStep1"));
      return;
    }

    setLoading(true);
    try {
      const raw = nsecImport.trim();
      if (!raw) {
        setError(t("errors.pasteNsec"));
        setLoading(false);
        return;
      }
      const dec = nip19.decode(raw);
      if (dec.type !== "nsec") {
        setError(t("errors.invalidNsec"));
        setLoading(false);
        return;
      }
      const sk = new Uint8Array(dec.data as Uint8Array);
      const derived = nip19.npubEncode(getPublicKey(sk));
      sk.fill(0);
      if (derived !== npubInput.trim()) {
        setError(t("errors.nsecMismatch"));
        setLoading(false);
        return;
      }

      if (!encryptPassword) {
        setError(t("errors.enterPassphrase"));
        setLoading(false);
        return;
      }

      const payload = await encryptNsec(raw, encryptPassword);
      setNsecImport("");

      const vaultRes = await fetch("/api/vault", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_id: id,
          blob: payload.blob,
          salt: payload.salt,
          iv: payload.iv,
          bunker_pubkey: npubInput.trim(),
        }),
      });
      const vJson = (await vaultRes.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!vaultRes.ok) {
        throw new Error(vJson.error ?? t("errors.saveVaultFailed"));
      }

      const unlockRes = await fetch("/api/auth/unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npub: npubInput.trim(),
          passphrase: encryptPassword,
        }),
      });
      if (!unlockRes.ok) {
        throw new Error(await parseUnlockError(unlockRes));
      }
      sessionStorage.setItem("bm_signer_backup_pending", id);
      setBackupVaultPayload(payload);
      setNeedsVaultBackup(true);
      await refreshStatus();
      setBunkerUri(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/auth/lock", {
        method: "POST",
        credentials: "include",
      });
      if (typeof window !== "undefined" && identityId) {
        sessionStorage.removeItem("bm_signer_backup_pending");
        sessionStorage.removeItem(`bm_signer_backup_ok_${identityId}`);
      }
      setNeedsVaultBackup(false);
      setBackupVaultPayload(null);
      setBunkerUri(null);
      setSessionLabel("");
      setPhase(1);
      vaultNsecRef.current = null;
      setPassphraseStep1("");
      setNpubInput("");
      setIdentityId("");
      setStep1Path("have_npub");
      setNsecImport("");
      setEncryptPassword("");
      setNpubDisplay("");
      await refreshStatus();
    } catch {
      setError(t("errors.lockFailed"));
    } finally {
      setLoading(false);
    }
  };

  const copyUri = async () => {
    if (!bunkerUri) return;
    await navigator.clipboard.writeText(bunkerUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="min-h-screen text-zinc-200 antialiased"
      style={{ backgroundColor: BG }}
    >
      <div className="mx-auto max-w-lg px-5 py-10 sm:py-14">
        <header className="mb-10 flex flex-col gap-4 border-b border-zinc-800/80 pb-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {t("header.brand")}
            </p>
            <LocaleSwitcher />
          </div>
          <h1 className="text-[clamp(1.5rem,4vw+0.75rem,1.75rem)] font-bold leading-tight tracking-tight text-white">
            {t("header.title")}
          </h1>
          <p className="text-base leading-[1.5] text-zinc-300">{t("header.subtitle")}</p>

          <div className="mt-1 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-base">
            <div className="flex flex-wrap items-center gap-3">
              <Radio
                className="size-5 shrink-0"
                style={{ color: ACCENT }}
                aria-hidden
              />
              <span className="text-zinc-300">{t("header.bunkerLabel")}</span>
              {statusIdentity ? (
                statusRunning ? (
                  <span className="font-semibold text-emerald-400">{t("header.active")}</span>
                ) : (
                  <span className="max-w-[min(100%,16rem)] font-medium leading-snug text-sky-200 sm:max-w-none">
                    {t("header.sessionManaged")}
                  </span>
                )
              ) : (
                <span className="text-zinc-400">{t("header.inactive")}</span>
              )}
              {statusIdentity ? (
                <button
                  type="button"
                  onClick={() => void handleLock()}
                  disabled={loading}
                  className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-600 px-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-50 sm:ml-0 sm:px-4"
                >
                  <LogOut className="size-4 shrink-0" aria-hidden />
                  {t("header.lockBunker")}
                </button>
              ) : null}
            </div>
            <p className="text-sm leading-[1.5] text-zinc-400">{t("header.serverNote")}</p>
          </div>
        </header>

        {!authChecked ? (
          <div className="mb-10 flex justify-center py-16">
            <Loader2
              className="size-10 animate-spin text-zinc-500"
              aria-label={t("loadingAuth")}
            />
          </div>
        ) : null}

        {authChecked && error ? (
          <div
            className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-base leading-[1.5] text-red-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {/* Identity — primary path: unlock with npub; fresh keypair is a secondary link */}
        {authChecked ? (
          <section className="mb-14 scroll-mt-8">
            <div className="mb-5 flex items-center gap-2">
              <Shield className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
                {t("step1.title")}
              </h2>
            </div>

            {statusIdentity &&
            (needsVaultBackup ||
              phase >= 3 ||
              (phase === 2 && step1Path === "have_npub")) ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-sm leading-[1.5] text-zinc-400">
                  {t("identity.vaultOpen")}
                </p>
                <code className="mt-2 block break-all font-mono text-sm leading-normal text-zinc-200">
                  {(() => {
                    const n = npubInput.trim() || npubDisplay.trim();
                    return n ? truncateMiddle(n, 24) : "—";
                  })()}
                </code>
              </div>
            ) : !statusIdentity ? (
              <>
                {step1Path === "have_npub" ? (
                  <>
                    <form onSubmit={(e) => void handleUnlock(e)} className="space-y-5">
                      <div>
                        <label htmlFor="npub" className="bm-label text-zinc-300">
                          {t("step1.npubLabel")}
                        </label>
                        <input
                          id="npub"
                          value={npubInput}
                          onChange={(e) => setNpubInput(e.target.value)}
                          autoComplete="off"
                          className="bm-input border-zinc-700 bg-zinc-900/50 font-mono text-white ring-offset-[#080808] placeholder:text-zinc-500 focus:ring-[#0066ff]"
                          placeholder="npub1…"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="passphrase" className="bm-label text-zinc-300">
                          {t("step1.passphraseLabel")}
                        </label>
                        <input
                          id="passphrase"
                          type="password"
                          value={passphraseStep1}
                          onChange={(e) => setPassphraseStep1(e.target.value)}
                          autoComplete="new-password"
                          className="bm-input border-zinc-700 bg-zinc-900/50 text-white ring-offset-[#080808] focus:ring-[#0066ff]"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Lock className="size-4" aria-hidden />
                        )}
                        {t("step1.unlock")}
                      </button>
                    </form>
                    <p className="mt-6 text-center text-sm text-zinc-500">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setStep1Path("fresh_npub");
                          ensureFreshKeypair();
                        }}
                        className="text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
                      >
                        {t("step1.freshNpubLink")}
                      </button>
                    </p>
                  </>
                ) : (
                  <form onSubmit={(e) => void handleFreshCreate(e)} className="space-y-5">
                    <p className="text-sm text-zinc-500">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setStep1Path("have_npub");
                        }}
                        className="text-zinc-400 underline-offset-2 hover:underline"
                      >
                        {t("step1.backToUnlock")}
                      </button>
                    </p>
                    <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm leading-[1.5] text-amber-100">
                      {t("step1.warnSaveNpub")}
                    </p>
                    <div>
                      <span className="bm-label text-zinc-300">{t("step1.npubReadonly")}</span>
                      <textarea
                        readOnly
                        value={npubDisplay}
                        rows={3}
                        className="bm-input min-h-[5.5rem] resize-none border-zinc-700 bg-zinc-950/80 py-3 font-mono text-zinc-200 ring-offset-[#080808] focus:ring-[#0066ff]"
                      />
                    </div>
                    <div>
                      <label htmlFor="enc_fresh" className="bm-label text-zinc-300">
                        {t("step1.passphraseLabel")}
                      </label>
                      <input
                        id="enc_fresh"
                        type="password"
                        value={encryptPassword}
                        onChange={(e) => setEncryptPassword(e.target.value)}
                        autoComplete="new-password"
                        className="bm-input border-zinc-700 bg-zinc-900/50 text-white ring-offset-[#080808] focus:ring-[#0066ff]"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <KeyRound className="size-4" aria-hidden />
                      )}
                      {t("step1.createVault")}
                    </button>
                  </form>
                )}
              </>
            ) : null}
          </section>
        ) : null}

        {authChecked &&
        statusIdentity &&
        needsVaultBackup &&
        (npubInput.trim() || npubDisplay.trim()) ? (
          <VaultBackupGate
            identityId={identityId}
            npub={npubInput.trim() || npubDisplay.trim()}
            initialVault={backupVaultPayload}
            onComplete={completeVaultBackup}
          />
        ) : null}

        {/* First-time vault: import nsec (only when session exists but no vault row yet) */}
        {authChecked && phase === 2 && !needsVaultBackup ? (
          <section className="mb-14 scroll-mt-8">
            <div className="mb-5 flex items-center gap-2">
              <KeyRound className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
                {t("step2.title")}
              </h2>
            </div>
            <form
              onSubmit={(e) => void handleStep2ImportVault(e)}
              className="space-y-5"
            >
              <p className="text-base leading-[1.5] text-zinc-300">{t("step2.body")}</p>
              <div>
                <label htmlFor="nsec_import" className="bm-label text-zinc-300">
                  {t("step2.nsecLabel")}
                </label>
                <textarea
                  id="nsec_import"
                  value={nsecImport}
                  onChange={(e) => setNsecImport(e.target.value)}
                  rows={3}
                  className="bm-input min-h-[5.5rem] resize-none border-zinc-700 bg-zinc-950/80 py-3 font-mono text-zinc-200 ring-offset-[#080808] placeholder:text-zinc-500 focus:ring-[#0066ff]"
                  placeholder="nsec1…"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="enc_pw_import" className="bm-label text-zinc-300">
                  {t("step2.encryptPassLabel")}
                </label>
                <input
                  id="enc_pw_import"
                  type="password"
                  value={encryptPassword}
                  onChange={(e) => setEncryptPassword(e.target.value)}
                  autoComplete="new-password"
                  className="bm-input border-zinc-700 bg-zinc-900/50 text-white ring-offset-[#080808] focus:ring-[#0066ff]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  t("step2.saveContinue")
                )}
              </button>
            </form>
          </section>
        ) : null}

        {/* Sessions preview + NIP-46 connect */}
        {authChecked && phase >= 3 && !needsVaultBackup ? (
          <section className="scroll-mt-8">
            <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-white">
                  {t("sessionsPreview.title")}
                </h2>
                <Link
                  href="/sessions"
                  className="text-sm font-medium underline-offset-2 hover:underline"
                  style={{ color: ACCENT }}
                >
                  {t("sessionsPreview.manage")}
                </Link>
              </div>
              {sessionsLoading ? (
                <p className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {tSess("loading")}
                </p>
              ) : sessionRows && sessionRows.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {sessionRows.slice(0, 6).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
                    >
                      <span className="font-medium text-zinc-200">
                        {row.app_name?.trim() || tSess("noLabel")}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span
                          className={
                            row.used ? "text-amber-200/90" : "text-emerald-400/90"
                          }
                        >
                          {row.used ? tSess("used") : tSess("pending")}
                        </span>
                        <span aria-hidden>·</span>
                        <time dateTime={row.expires_at}>
                          {tSess("expires")}{" "}
                          {new Date(row.expires_at).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </time>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-[1.5] text-zinc-500">
                  {t("sessionsPreview.empty")}
                </p>
              )}
            </div>

            <div className="mb-5 flex items-center gap-2">
              <Radio className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
                {t("step3.title")}
              </h2>
            </div>

            {!bunkerUri ? (
              <div className="space-y-5">
                <p className="text-base leading-[1.5] text-zinc-300">{t("step3.explain")}</p>
                <div>
                  <label htmlFor="session_label" className="bm-label text-zinc-300">
                    {t("step3.labelOptional")}
                  </label>
                  <input
                    id="session_label"
                    value={sessionLabel}
                    onChange={(e) => setSessionLabel(e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                    placeholder={t("step3.labelPlaceholder")}
                    className="bm-input border-zinc-700 bg-zinc-900/50 text-white ring-offset-[#080808] placeholder:text-zinc-500 focus:ring-[#0066ff]"
                  />
                  <p className="mt-2 text-sm leading-[1.5] text-zinc-400">{t("step3.labelHint")}</p>
                </div>
                <button
                  type="button"
                  disabled={loading || !identityId.trim()}
                  onClick={() => {
                    void createSessionAndQr(identityId.trim());
                  }}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: ACCENT }}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Radio className="size-4" aria-hidden />
                  )}
                  {t("step3.generateQr")}
                </button>
              </div>
            ) : (
              <>
                <p className="mb-8 space-y-3 text-base leading-[1.5] text-zinc-300">
                  <span className="block">{t("step3.qrHelp1")}</span>
                  <span className="block text-zinc-400">{t("step3.qrHelp2")}</span>
                </p>
                <div className="mb-8 flex justify-center rounded-xl border border-zinc-800 bg-white p-5">
                  <QRCodeSVG value={bunkerUri} size={200} level="M" />
                </div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <code className="flex min-h-12 flex-1 items-center break-all rounded-lg border border-zinc-800 bg-zinc-950/80 px-4 py-3 font-mono text-sm leading-normal text-zinc-300">
                    {truncateMiddle(bunkerUri, 18)}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyUri()}
                    className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-4 text-base font-semibold text-zinc-100 hover:bg-zinc-800"
                  >
                    {copied ? (
                      <Check className="size-5 text-emerald-400" aria-hidden />
                    ) : (
                      <Copy className="size-5" aria-hidden />
                    )}
                    {copied ? t("step3.copied") : t("step3.copy")}
                  </button>
                </div>
                <p className="text-center text-sm text-zinc-500">
                  <button
                    type="button"
                    disabled={loading || !identityId.trim()}
                    onClick={() => {
                      setBunkerUri(null);
                    }}
                    className="text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline disabled:opacity-50"
                  >
                    {t("step3.newLinkInline")}
                  </button>
                </p>
              </>
            )}
          </section>
        ) : null}

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-zinc-800/80 pt-8">
          <SignerBuildStamp variant="compact" className="justify-center" />
          <p className="text-center text-sm leading-[1.5] text-zinc-400">
            <Link href="/" className="font-semibold underline-offset-2 hover:underline" style={{ color: ACCENT }}>
              {t("homeLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
