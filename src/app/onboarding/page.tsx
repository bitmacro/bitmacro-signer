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
  if (res.status === 401) return "Passphrase incorrecta";
  if (res.status === 404) return "Npub não registado nesta Identity";
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* ignore */
  }
  return "Erro ao desbloquear";
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
  /** npub (ou hex) da **app** onde vais colar o bunker — tem de coincidir com a chave que assina o NIP-46 (ex. Nostrudel). */
  const [clientAppPubkey, setClientAppPubkey] = useState("");
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

  const createSessionAndQr = useCallback(async (id: string, clientPubkeyRaw: string) => {
    setLoading(true);
    setError(null);
    let appPubkey: string;
    try {
      appPubkey = nostrPubkeyInputToHex(clientPubkeyRaw);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pubkey do cliente inválido");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_id: id,
          app_pubkey: appPubkey,
          app_name: "BitMacro Signer",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        bunker_uri?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível criar a sessão");
      }
      if (!data.bunker_uri) {
        throw new Error("Resposta sem bunker_uri");
      }
      setBunkerUri(data.bunker_uri);
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setClientAppPubkey("");
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
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
      setError("Gera o par ou recarrega a opção «Não tenho npub ainda».");
      return;
    }
    if (!encryptPassword) {
      setError("Indica a passphrase do cofre.");
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
        throw new Error(bootJson.error ?? "Não foi possível criar a identidade");
      }
      const id = bootJson.identity_id?.trim();
      if (!id) {
        throw new Error("Resposta sem identity_id");
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
        throw new Error(vJson.error ?? "Erro ao guardar o cofre");
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
      setClientAppPubkey("");
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2ImportVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = identityId.trim();
    if (!id) {
      setError("identity_id em falta — volta ao passo 1.");
      return;
    }

    setLoading(true);
    try {
      const raw = nsecImport.trim();
      if (!raw) {
        setError("Cola a tua nsec.");
        setLoading(false);
        return;
      }
      const dec = nip19.decode(raw);
      if (dec.type !== "nsec") {
        setError("Formato nsec inválido (esperado nsec1…).");
        setLoading(false);
        return;
      }
      const sk = new Uint8Array(dec.data as Uint8Array);
      const derived = nip19.npubEncode(getPublicKey(sk));
      sk.fill(0);
      if (derived !== npubInput.trim()) {
        setError("Esta nsec não corresponde ao teu npub");
        setLoading(false);
        return;
      }

      if (!encryptPassword) {
        setError("Indica a passphrase do cofre.");
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
        throw new Error(vJson.error ?? "Erro ao guardar o cofre");
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
      setClientAppPubkey("");
      setPhase(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
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
      setClientAppPubkey("");
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
      setError("Erro ao bloquear");
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
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <header className="mb-10 flex flex-col gap-3 border-b border-zinc-800/80 pb-8">
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            BitMacro Signer
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Activar o bunker
          </h1>
          <p className="text-[14px] leading-relaxed text-zinc-400">
            Usa o npub da tua Identity BitMacro, a passphrase do cofre, e obtém o QR
            NIP-46.
          </p>

          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-[13px]">
            <div className="flex flex-wrap items-center gap-3">
              <Radio
                className="size-4 shrink-0"
                style={{ color: ACCENT }}
                aria-hidden
              />
              <span className="text-zinc-400">Bunker:</span>
              {statusIdentity ? (
                statusRunning ? (
                  <span className="font-medium text-emerald-400">Activo</span>
                ) : (
                  <span className="max-w-[min(100%,16rem)] font-medium leading-snug text-sky-300/95 sm:max-w-none">
                    Sessão activa — bunker em modo managed (Server)
                  </span>
                )
              ) : (
                <span className="text-zinc-500">Inactivo</span>
              )}
              {statusIdentity ? (
                <button
                  type="button"
                  onClick={() => void handleLock()}
                  disabled={loading}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1 text-[12px] text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  <LogOut className="size-3.5" aria-hidden />
                  Bloquear bunker
                </button>
              ) : null}
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              O bunker corre no servidor — não depende desta janela estar aberta.
            </p>
            {statusIdentity && phase === 1 && step1Path === "have_npub" ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setIdentityId(statusIdentity);
                  setBunkerUri(null);
                  setClientAppPubkey("");
                  setPhase(3);
                }}
                className="w-full rounded-md py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                Retomar: passo 3 — gerar QR (npub da app)
              </button>
            ) : null}
          </div>
        </header>

        <nav
          className="mb-10 flex items-center justify-center gap-2 text-[12px] text-zinc-500"
          aria-label="Passos"
        >
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="flex items-center gap-2">
              <span
                className="flex size-8 items-center justify-center rounded-full border text-[13px] font-semibold"
                style={{
                  borderColor: phase >= n ? ACCENT : "#3f3f46",
                  color: phase >= n ? ACCENT : "#71717a",
                  backgroundColor: phase === n ? "rgba(0,102,255,0.12)" : "transparent",
                }}
              >
                {n}
              </span>
              {n < 3 ? (
                <span className="h-px w-6 bg-zinc-800" aria-hidden />
              ) : null}
            </div>
          ))}
        </nav>

        {error ? (
          <div
            className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-[13px] text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {/* Step 1 */}
        <section className="mb-14 scroll-mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="size-5" style={{ color: ACCENT }} aria-hidden />
            <h2 className="text-lg font-semibold text-white">
              1. Identificação
            </h2>
          </div>

          <div className="mb-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep1Path("have_npub");
              }}
              className={`rounded-lg border px-4 py-3 text-left text-[14px] transition-colors ${
                step1Path === "have_npub"
                  ? "border-[#0066ff]/50 bg-[rgba(0,102,255,0.08)]"
                  : "border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <span className="font-medium text-white">Já tenho npub</span>
              <span className="mt-1 block text-[12px] text-zinc-500">
                Npub BitMacro Identity + passphrase do cofre
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep1Path("fresh_npub");
                ensureFreshKeypair();
              }}
              className={`rounded-lg border px-4 py-3 text-left text-[14px] transition-colors ${
                step1Path === "fresh_npub"
                  ? "border-[#0066ff]/50 bg-[rgba(0,102,255,0.08)]"
                  : "border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <span className="font-medium text-white">Não tenho npub ainda</span>
              <span className="mt-1 block text-[12px] text-zinc-500">
                Gera um par no browser e cria o cofre sem passar pelo unlock
              </span>
            </button>
          </div>

          {step1Path === "have_npub" ? (
            <form onSubmit={(e) => void handleUnlock(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="npub"
                  className="mb-1.5 block text-[13px] text-zinc-400"
                >
                  Chave pública Nostr (npub)
                </label>
                <input
                  id="npub"
                  value={npubInput}
                  onChange={(e) => setNpubInput(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 font-mono text-[12px] text-white outline-none ring-offset-2 ring-offset-[#080808] focus:ring-2 focus:ring-[#0066ff]"
                  placeholder="npub1…"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="passphrase"
                  className="mb-1.5 block text-[13px] text-zinc-400"
                >
                  Passphrase do cofre
                </label>
                <input
                  id="passphrase"
                  type="password"
                  value={passphraseStep1}
                  onChange={(e) => setPassphraseStep1(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-[14px] text-white outline-none ring-offset-2 ring-offset-[#080808] focus:ring-2 focus:ring-[#0066ff]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Lock className="size-4" aria-hidden />
                )}
                Desbloquear
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void handleFreshCreate(e)} className="space-y-4">
              <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-100/90">
                Guarda este npub — é a tua identidade Nostr no bunker. Depois do cofre,
                podes associá-la à BitMacro Identity se quiseres.
              </p>
              <div>
                <span className="mb-1.5 block text-[13px] text-zinc-400">
                  npub gerado (readonly)
                </span>
                <textarea
                  readOnly
                  value={npubDisplay}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 font-mono text-[12px] text-zinc-300"
                />
              </div>
              <div>
                <label
                  htmlFor="enc_fresh"
                  className="mb-1.5 block text-[13px] text-zinc-400"
                >
                  Passphrase do cofre
                </label>
                <input
                  id="enc_fresh"
                  type="password"
                  value={encryptPassword}
                  onChange={(e) => setEncryptPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-[14px] text-white outline-none ring-offset-2 ring-offset-[#080808] focus:ring-2 focus:ring-[#0066ff]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <KeyRound className="size-4" aria-hidden />
                )}
                Criar cofre e activar bunker
              </button>
            </form>
          )}
        </section>

        {/* Step 2 — import nsec (após unlock sem vault, fluxo «Já tenho npub») */}
        {phase >= 2 ? (
          <section className="mb-14 scroll-mt-8 opacity-100">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold text-white">
                2. Keypair e cofre
              </h2>
            </div>
            {phase === 2 ? (
              <form
                onSubmit={(e) => void handleStep2ImportVault(e)}
                className="space-y-4"
              >
                <p className="text-[13px] leading-relaxed text-zinc-400">
                  Ainda não há cofre no Signer para este npub. Cola a nsec que corresponde
                  ao npub do passo 1 e define a passphrase para encriptar o cofre.
                </p>
                <div>
                  <label
                    htmlFor="nsec_import"
                    className="mb-1.5 block text-[13px] text-zinc-400"
                  >
                    nsec (bech32)
                  </label>
                  <textarea
                    id="nsec_import"
                    value={nsecImport}
                    onChange={(e) => setNsecImport(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 font-mono text-[11px] text-zinc-300"
                    placeholder="nsec1…"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label
                    htmlFor="enc_pw_import"
                    className="mb-1.5 block text-[13px] text-zinc-400"
                  >
                    Passphrase para encriptar o cofre
                  </label>
                  <input
                    id="enc_pw_import"
                    type="password"
                    value={encryptPassword}
                    onChange={(e) => setEncryptPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-[14px] text-white outline-none focus:ring-2 focus:ring-[#0066ff] ring-offset-2 ring-offset-[#080808]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: ACCENT }}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    "Guardar cofre e continuar"
                  )}
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-zinc-500">Cofre já criado — passo concluído.</p>
            )}
          </section>
        ) : null}

        {/* Step 3 */}
        {phase >= 3 ? (
          <section className="scroll-mt-8">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold text-white">
                3. Sessão NIP-46
              </h2>
            </div>

            {!bunkerUri ? (
              <div className="space-y-4">
                <p className="text-[14px] leading-relaxed text-zinc-400">
                  Indica o <strong className="text-zinc-200">npub da conta</strong> na app onde vais colar o bunker
                  (ex. Nostrudel → definições / a tua chave). Tem de ser exactamente essa chave: o NIP-46
                  assina com ela e o servidor valida o par.
                </p>
                <div>
                  <label
                    htmlFor="client_app_npub"
                    className="mb-1.5 block text-[13px] text-zinc-400"
                  >
                    npub da app cliente (Nostrudel, Amethyst, …)
                  </label>
                  <input
                    id="client_app_npub"
                    value={clientAppPubkey}
                    onChange={(e) => setClientAppPubkey(e.target.value)}
                    autoComplete="off"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 font-mono text-[12px] text-white outline-none ring-offset-2 ring-offset-[#080808] focus:ring-2 focus:ring-[#0066ff]"
                    placeholder="npub1…"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || !identityId.trim()}
                  onClick={() => {
                    void createSessionAndQr(identityId.trim(), clientAppPubkey);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: ACCENT }}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Radio className="size-4" aria-hidden />
                  )}
                  Gerar QR / link bunker
                </button>
              </div>
            ) : (
              <>
                <p className="mb-6 text-[14px] leading-relaxed text-zinc-400">
                  Cola este QR no cliente ou copia o link. O par foi criado para o npub que indicaste
                  acima.
                </p>
                <div className="mb-6 flex justify-center rounded-xl border border-zinc-800 bg-white p-4">
                  <QRCodeSVG value={bunkerUri} size={200} level="M" />
                </div>
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 break-all rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-[11px] text-zinc-400">
                    {truncateMiddle(bunkerUri, 18)}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyUri()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-3 py-2 text-[13px] text-zinc-200 hover:bg-zinc-800"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-400" aria-hidden />
                    ) : (
                      <Copy className="size-4" aria-hidden />
                    )}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <Link
                  href="/sessions"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-600 py-3 text-[14px] font-medium text-zinc-200 transition-colors hover:bg-zinc-900"
                >
                  Ver sessões activas
                </Link>
              </>
            )}
          </section>
        ) : null}

        <p className="mt-12 text-center text-[12px] text-zinc-600">
          <Link href="/" className="underline-offset-2 hover:underline" style={{ color: ACCENT }}>
            ← Página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
