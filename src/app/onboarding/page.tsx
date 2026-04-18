"use client";

import Link from "next/link";
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
import { nostrPubkeyInputToHex } from "@/lib/session/ttl";
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

function truncateMiddle(s: string, keep = 14): string {
  if (s.length <= keep * 2 + 3) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

async function parseUnlockError(res: Response): Promise<string> {
  if (res.status === 401) return "Incorrect passphrase";
  if (res.status === 404) return "Npub not registered for this Identity";
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* ignore */
  }
  return "Failed to unlock";
}

export default function OnboardingPage() {
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

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status", { credentials: "include" });
      if (!res.ok) {
        setStatusIdentity(null);
        setStatusRunning(null);
        return;
      }
      const j = (await res.json()) as {
        identity_id: string;
        is_running: boolean;
      };
      setStatusIdentity(j.identity_id);
      setStatusRunning(j.is_running);
      setIdentityId(j.identity_id);
    } catch {
      setStatusIdentity(null);
      setStatusRunning(null);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

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
        setError(e instanceof Error ? e.message : "Invalid client pubkey");
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
        throw new Error(data.error ?? "Could not create session");
      }
      if (!data.bunker_uri) {
        throw new Error("Response missing bunker_uri");
      }
      setBunkerUri(data.bunker_uri);
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [sessionLabel]);

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
      setError(err instanceof Error ? err.message : "Error");
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
      setError("Generate the keypair or reload the “I don’t have an npub yet” option.");
      return;
    }
    if (!encryptPassword) {
      setError("Enter the vault passphrase.");
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
        throw new Error(bootJson.error ?? "Could not create identity");
      }
      const id = bootJson.identity_id?.trim();
      if (!id) {
        throw new Error("Response missing identity_id");
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
        throw new Error(vJson.error ?? "Failed to save vault");
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
      await refreshStatus();
      setBunkerUri(null);
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2ImportVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = identityId.trim();
    if (!id) {
      setError("Missing identity_id — go back to step 1.");
      return;
    }

    setLoading(true);
    try {
      const raw = nsecImport.trim();
      if (!raw) {
        setError("Paste your nsec.");
        setLoading(false);
        return;
      }
      const dec = nip19.decode(raw);
      if (dec.type !== "nsec") {
        setError("Invalid nsec format (expected nsec1…).");
        setLoading(false);
        return;
      }
      const sk = new Uint8Array(dec.data as Uint8Array);
      const derived = nip19.npubEncode(getPublicKey(sk));
      sk.fill(0);
      if (derived !== npubInput.trim()) {
        setError("This nsec does not match your npub");
        setLoading(false);
        return;
      }

      if (!encryptPassword) {
        setError("Enter the vault passphrase.");
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
        throw new Error(vJson.error ?? "Failed to save vault");
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
      await refreshStatus();
      setBunkerUri(null);
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
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
      setError("Failed to lock");
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
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            BitMacro Signer
          </p>
          <h1 className="text-[clamp(1.5rem,4vw+0.75rem,1.75rem)] font-bold leading-tight tracking-tight text-white">
            Activate the bunker
          </h1>
          <p className="text-base leading-[1.5] text-zinc-300">
            Use your BitMacro Identity npub and vault passphrase to get the NIP-46 QR code.
          </p>

          <div className="mt-1 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-base">
            <div className="flex flex-wrap items-center gap-3">
              <Radio
                className="size-5 shrink-0"
                style={{ color: ACCENT }}
                aria-hidden
              />
              <span className="text-zinc-300">Bunker:</span>
              {statusIdentity ? (
                statusRunning ? (
                  <span className="font-semibold text-emerald-400">Active</span>
                ) : (
                  <span className="max-w-[min(100%,16rem)] font-medium leading-snug text-sky-200 sm:max-w-none">
                    Session active — bunker in managed (server) mode
                  </span>
                )
              ) : (
                <span className="text-zinc-400">Inactive</span>
              )}
              {statusIdentity ? (
                <button
                  type="button"
                  onClick={() => void handleLock()}
                  disabled={loading}
                  className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-600 px-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-50 sm:ml-0 sm:px-4"
                >
                  <LogOut className="size-4 shrink-0" aria-hidden />
                  Lock bunker
                </button>
              ) : null}
            </div>
            <p className="text-sm leading-[1.5] text-zinc-400">
              The bunker runs on the server — it does not depend on this tab staying open.
            </p>
            {statusIdentity && phase === 1 && step1Path === "have_npub" ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setIdentityId(statusIdentity);
                  setBunkerUri(null);
                  setPhase(3);
                }}
                className="min-h-[52px] w-full rounded-lg px-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                Resume: step 3 — generate NIP-46 QR
              </button>
            ) : null}
          </div>
        </header>

        <nav
          className="mb-10 flex items-center justify-center gap-2 text-sm text-zinc-400"
          aria-label="Steps"
        >
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="flex items-center gap-2">
              <span
                className="flex size-11 items-center justify-center rounded-full border text-base font-semibold"
                style={{
                  borderColor: phase >= n ? ACCENT : "#52525b",
                  color: phase >= n ? ACCENT : "#d4d4d8",
                  backgroundColor: phase === n ? "rgba(0,102,255,0.12)" : "transparent",
                }}
              >
                {n}
              </span>
              {n < 3 ? (
                <span className="h-px w-6 bg-zinc-700" aria-hidden />
              ) : null}
            </div>
          ))}
        </nav>

        {error ? (
          <div
            className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-base leading-[1.5] text-red-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {/* Step 1 */}
        <section className="mb-14 scroll-mt-8">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="size-5" style={{ color: ACCENT }} aria-hidden />
            <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
              1. Identity
            </h2>
          </div>

          <div className="mb-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep1Path("have_npub");
              }}
              className={`min-h-[52px] rounded-xl border px-4 py-3 text-left text-base transition-colors ${
                step1Path === "have_npub"
                  ? "border-[#0066ff]/50 bg-[rgba(0,102,255,0.08)]"
                  : "border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <span className="font-semibold text-white">I already have an npub</span>
              <span className="mt-1 block text-sm leading-[1.5] text-zinc-400">
                BitMacro Identity npub + vault passphrase
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep1Path("fresh_npub");
                ensureFreshKeypair();
              }}
              className={`min-h-[52px] rounded-xl border px-4 py-3 text-left text-base transition-colors ${
                step1Path === "fresh_npub"
                  ? "border-[#0066ff]/50 bg-[rgba(0,102,255,0.08)]"
                  : "border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <span className="font-semibold text-white">I don’t have an npub yet</span>
              <span className="mt-1 block text-sm leading-[1.5] text-zinc-400">
                Generate a keypair in the browser and create the vault without unlock first
              </span>
            </button>
          </div>

          {step1Path === "have_npub" ? (
            <form onSubmit={(e) => void handleUnlock(e)} className="space-y-5">
              <div>
                <label htmlFor="npub" className="bm-label text-zinc-300">
                  Nostr public key (npub)
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
                  Vault passphrase
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
                Unlock
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void handleFreshCreate(e)} className="space-y-5">
              <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm leading-[1.5] text-amber-100">
                Save this npub — it is your Nostr identity for the bunker. After the vault is set up,
                you can link it to BitMacro Identity if you want.
              </p>
              <div>
                <span className="bm-label text-zinc-300">Generated npub (read-only)</span>
                <textarea
                  readOnly
                  value={npubDisplay}
                  rows={3}
                  className="bm-input min-h-[5.5rem] resize-none border-zinc-700 bg-zinc-950/80 py-3 font-mono text-zinc-200 ring-offset-[#080808] focus:ring-[#0066ff]"
                />
              </div>
              <div>
                <label htmlFor="enc_fresh" className="bm-label text-zinc-300">
                  Vault passphrase
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
                Create vault and activate bunker
              </button>
            </form>
          )}
        </section>

        {/* Step 2 — import nsec after unlock with no vault (“I already have an npub” flow) */}
        {phase >= 2 ? (
          <section className="mb-14 scroll-mt-8 opacity-100">
            <div className="mb-5 flex items-center gap-2">
              <KeyRound className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
                2. Keypair and vault
              </h2>
            </div>
            {phase === 2 ? (
              <form
                onSubmit={(e) => void handleStep2ImportVault(e)}
                className="space-y-5"
              >
                <p className="text-base leading-[1.5] text-zinc-300">
                  There is no vault in Signer for this npub yet. Paste the nsec that matches
                  the npub from step 1 and set a passphrase to encrypt the vault.
                </p>
                <div>
                  <label htmlFor="nsec_import" className="bm-label text-zinc-300">
                    nsec (bech32)
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
                    Passphrase to encrypt the vault
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
                    "Save vault and continue"
                  )}
                </button>
              </form>
            ) : (
              <p className="text-base leading-[1.5] text-zinc-400">Vault already created — step complete.</p>
            )}
          </section>
        ) : null}

        {/* Step 3 */}
        {phase >= 3 ? (
          <section className="scroll-mt-8">
            <div className="mb-5 flex items-center gap-2">
              <KeyRound className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
                3. NIP-46 session
              </h2>
            </div>

            {!bunkerUri ? (
              <div className="space-y-5">
                <p className="text-base leading-[1.5] text-zinc-300">
                  NIP-46 uses a <strong className="font-semibold text-zinc-100">temporary client key</strong>{" "}
                  (not your profile npub). Generate the QR and paste it in the app — on first connect the client
                  sends that key and the session is bound automatically.
                </p>
                <div>
                  <label htmlFor="session_label" className="bm-label text-zinc-300">
                    Label (optional)
                  </label>
                  <input
                    id="session_label"
                    value={sessionLabel}
                    onChange={(e) => setSessionLabel(e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                    placeholder="e.g. Nostrudel · Coracle on phone"
                    className="bm-input border-zinc-700 bg-zinc-900/50 text-white ring-offset-[#080808] placeholder:text-zinc-500 focus:ring-[#0066ff]"
                  />
                  <p className="mt-2 text-sm leading-[1.5] text-zinc-400">
                    The protocol <strong className="font-semibold text-zinc-300">does not send</strong> the
                    app name (Nostrudel, Coracle, …). This label is shown in sessions so you can tell them apart.
                  </p>
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
                  Generate QR / bunker link
                </button>
              </div>
            ) : (
              <>
                <p className="mb-8 space-y-3 text-base leading-[1.5] text-zinc-300">
                  <span className="block">
                    Paste this QR in the client or copy the full link. Each QR is single-use: after an
                    app connects successfully, that link stops working.
                  </span>
                  <span className="block text-zinc-400">
                    For <strong className="font-semibold text-zinc-200">another app</strong> (e.g. Coracle
                    after Nostrudel), generate a <strong className="font-semibold text-zinc-200">new</strong>{" "}
                    QR and paste it there — remove old bunker connections in the app if it still caches a
                    previous link.
                  </span>
                </p>
                <div className="mb-8 flex justify-center rounded-xl border border-zinc-800 bg-white p-5">
                  <QRCodeSVG value={bunkerUri} size={200} level="M" />
                </div>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
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
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={loading || !identityId.trim()}
                  onClick={() => {
                    setBunkerUri(null);
                  }}
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-lg border border-zinc-600 px-4 text-base font-semibold text-zinc-100 transition-colors hover:bg-zinc-900 disabled:opacity-60"
                >
                  Generate another QR (invalidates the one on this screen)
                </button>
                <Link
                  href="/sessions"
                  className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-lg border border-zinc-600 px-4 text-base font-semibold text-zinc-100 transition-colors hover:bg-zinc-900"
                >
                  View active sessions
                </Link>
              </>
            )}
          </section>
        ) : null}

        <p className="mt-12 text-center text-sm leading-[1.5] text-zinc-400">
          <Link href="/" className="font-semibold underline-offset-2 hover:underline" style={{ color: ACCENT }}>
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
