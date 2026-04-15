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
import { generateSecretKey, getPublicKey } from "nostr-tools";
import * as nip19 from "nostr-tools/nip19";
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
type VaultMode = "import" | "generate" | null;

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

  const [npubInput, setNpubInput] = useState("");
  const [passphraseStep1, setPassphraseStep1] = useState("");

  const [identityId, setIdentityId] = useState("");

  const [vaultMode, setVaultMode] = useState<VaultMode>(null);
  const vaultNsecRef = useRef<string | null>(null);

  const [nsecImport, setNsecImport] = useState("");
  const [npubDisplay, setNpubDisplay] = useState("");
  const [encryptPassword, setEncryptPassword] = useState("");

  const [bunkerUri, setBunkerUri] = useState<string | null>(null);
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

  const createSessionAndQr = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      const sk = generateSecretKey();
      try {
        const appPubkey = getPublicKey(sk);
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
      } finally {
        sk.fill(0);
      }
      setLoading(false);
    },
    [],
  );

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
        setVaultMode(null);
        vaultNsecRef.current = null;
        setNsecImport("");
        setNpubDisplay("");
        setEncryptPassword("");
        setPhase(2);
        return;
      }

      await createSessionAndQr(data.identity_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const startGenerateMode = () => {
    setError(null);
    setVaultMode("generate");
    const { nsec, npub } = generateKeypair();
    vaultNsecRef.current = nsec;
    setNpubDisplay(npub);
    setEncryptPassword("");
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = identityId.trim();
    if (!id) {
      setError("identity_id em falta — volta ao passo 1.");
      return;
    }
    if (!vaultMode) {
      setError("Escolhe uma opção.");
      return;
    }

    setLoading(true);
    try {
      let nsecMaterial: string | null = null;
      let bunkerNpub: string;

      if (vaultMode === "import") {
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
        nsecMaterial = raw;
        bunkerNpub = npubInput.trim();
      } else {
        const ref = vaultNsecRef.current;
        if (!ref) {
          setError("Gera o par novamente (escolhe de novo «Gerar novo par»).");
          setLoading(false);
          return;
        }
        nsecMaterial = ref;
        bunkerNpub = npubDisplay.trim();
      }

      if (!encryptPassword) {
        setError("Indica a passphrase do cofre.");
        setLoading(false);
        return;
      }

      const payload = await encryptNsec(nsecMaterial, encryptPassword);
      if (vaultMode === "import") {
        setNsecImport("");
      } else {
        vaultNsecRef.current = null;
      }
      nsecMaterial = "";

      const vaultRes = await fetch("/api/vault", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_id: id,
          blob: payload.blob,
          salt: payload.salt,
          iv: payload.iv,
          bunker_pubkey: bunkerNpub,
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
      setPhase(3);
      await createSessionAndQr(id);
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
      setPhase(1);
      vaultNsecRef.current = null;
      setPassphraseStep1("");
      setNpubInput("");
      setIdentityId("");
      setVaultMode(null);
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
                <span
                  className={
                    statusRunning ? "font-medium text-emerald-400" : "text-amber-400"
                  }
                >
                  {statusRunning ? "Activo" : "Inactivo"}
                </span>
              ) : (
                <span className="text-zinc-500">Sem sessão</span>
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
            {statusIdentity && phase === 1 ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setIdentityId(statusIdentity);
                  void createSessionAndQr(statusIdentity);
                }}
                className="w-full rounded-md py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                Retomar: gerar QR NIP-46 (sessão activa)
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
        </section>

        {/* Step 2 */}
        {phase >= 2 ? (
          <section className="mb-14 scroll-mt-8 opacity-100">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold text-white">
                2. Keypair e cofre
              </h2>
            </div>
            {phase === 2 ? (
              <div className="space-y-4">
                <p className="text-[13px] leading-relaxed text-zinc-400">
                  Ainda não tens cofre no Signer para este npub. Escolhe como
                  queres continuar.
                </p>

                {vaultMode === null ? (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setVaultMode("import");
                        vaultNsecRef.current = null;
                        setNpubDisplay("");
                        setNsecImport("");
                        setEncryptPassword("");
                      }}
                      className="rounded-lg border border-zinc-600 px-4 py-3 text-left text-[14px] text-zinc-200 transition-colors hover:bg-zinc-800"
                    >
                      <span className="font-medium text-white">
                        Já tenho uma nsec
                      </span>
                      <span className="mt-1 block text-[12px] text-zinc-500">
                        Importa a chave que corresponde a este npub
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startGenerateMode()}
                      className="rounded-lg border border-zinc-600 px-4 py-3 text-left text-[14px] text-zinc-200 transition-colors hover:bg-zinc-800"
                    >
                      <span className="font-medium text-white">
                        Não tenho npub ainda
                      </span>
                      <span className="mt-1 block text-[12px] text-zinc-500">
                        Gera um par só para o bunker (nsec só encriptada no cofre)
                      </span>
                    </button>
                  </div>
                ) : null}

                {vaultMode === "import" ? (
                  <form onSubmit={(e) => void handleCreateVault(e)} className="space-y-4">
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVaultMode(null);
                          setNsecImport("");
                        }}
                        className="rounded-lg border border-zinc-600 px-3 py-2 text-[13px] text-zinc-400"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 rounded-lg px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {loading ? (
                          <Loader2 className="mx-auto size-4 animate-spin" />
                        ) : (
                          "Guardar cofre e continuar"
                        )}
                      </button>
                    </div>
                  </form>
                ) : null}

                {vaultMode === "generate" ? (
                  <form onSubmit={(e) => void handleCreateVault(e)} className="space-y-4">
                    <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[12px] text-amber-100/90">
                      Guarda este npub — é a identidade Nostr usada pelo bunker
                      (pode ser diferente do npub da BitMacro Identity se geraste um
                      par novo).
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
                        htmlFor="enc_pw_gen"
                        className="mb-1.5 block text-[13px] text-zinc-400"
                      >
                        Passphrase para encriptar o cofre
                      </label>
                      <input
                        id="enc_pw_gen"
                        type="password"
                        value={encryptPassword}
                        onChange={(e) => setEncryptPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-[14px] text-white outline-none focus:ring-2 focus:ring-[#0066ff] ring-offset-2 ring-offset-[#080808]"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVaultMode(null);
                          vaultNsecRef.current = null;
                          setNpubDisplay("");
                          setEncryptPassword("");
                        }}
                        className="rounded-lg border border-zinc-600 px-3 py-2 text-[13px] text-zinc-400"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 rounded-lg px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {loading ? (
                          <Loader2 className="mx-auto size-4 animate-spin" />
                        ) : (
                          "Guardar cofre e continuar"
                        )}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : (
              <p className="text-[13px] text-zinc-500">Cofre já criado — passo concluído.</p>
            )}
          </section>
        ) : null}

        {/* Step 3 */}
        {phase >= 3 && bunkerUri ? (
          <section className="scroll-mt-8">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-5" style={{ color: ACCENT }} aria-hidden />
              <h2 className="text-lg font-semibold text-white">
                3. Sessão NIP-46
              </h2>
            </div>
            <p className="mb-6 text-[14px] leading-relaxed text-zinc-400">
              Cola este QR no teu cliente Nostr (Nostrudel, Coracle, etc.) ou copia o link.
              A ligação usa uma chave de aplicação gerada neste passo.
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
