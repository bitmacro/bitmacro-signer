"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

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
}: {
  row: SessionRow;
  copiedKey: string | null;
  onCopied: (key: string) => void;
}) {
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
        <p className="text-base leading-[1.5] text-zinc-400">
          Sem etiqueta — definida ao gerar o QR no onboarding
        </p>
      )}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Chave de sessão no cliente (NIP-46)
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
            {copiedKey === kNpub ? "Copiado" : "Copiar npub"}
          </button>
        </div>
      ) : null}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Hex (técnico)
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
          {copiedKey === kHex ? "Copiado" : "Copiar hex"}
        </button>
      </div>
      <div className="mt-4 text-sm leading-[1.5] text-zinc-400">
        expira {new Date(row.expires_at).toLocaleString()}{" "}
        {row.used ? "· usada" : "· pendente"}
      </div>
    </li>
  );
}

export default function SessionsPage() {
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const st = await fetch("/api/auth/status", { credentials: "include" });
      if (!st.ok) {
        setIdentityId(null);
        setRows(null);
        setError("Sessão necessária");
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
        throw new Error(j.error ?? "Erro ao listar sessões");
      }
      const data = (await res.json()) as SessionRow[];
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div
      className="min-h-screen text-zinc-200 antialiased"
      style={{ backgroundColor: BG }}
    >
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <header className="mb-10 border-b border-zinc-800 pb-8">
          <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            BitMacro Signer
          </p>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw+0.85rem,1.875rem)] font-bold leading-tight text-white">
            Sessões activas
          </h1>
          {identityId ? (
            <p className="mt-3 break-all font-mono text-sm text-zinc-400">{identityId}</p>
          ) : null}
          <p className="mt-4 max-w-2xl text-base leading-[1.5] text-zinc-300">
            O NIP-46 não envia o nome da app: usa a <strong className="font-semibold text-zinc-100">chave de sessão</strong>{" "}
            (npub/hex abaixo). Se definires uma <strong className="font-semibold text-zinc-100">etiqueta</strong> ao gerar o
            QR, ela aparece em destaque.
          </p>
        </header>

        {loading ? (
          <div className="flex min-h-12 items-center gap-3 text-base text-zinc-300">
            <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            A carregar…
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-base leading-[1.5] text-amber-100">
            {error}{" "}
            <Link
              href="/onboarding"
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: ACCENT }}
            >
              Onboarding
            </Link>
          </div>
        ) : null}

        {rows && rows.length === 0 ? (
          <p className="text-base leading-[1.5] text-zinc-400">Nenhuma sessão de cliente.</p>
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
              />
            ))}
          </ul>
        ) : null}

        <p className="mt-12 text-base leading-[1.5]">
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline"
            style={{ color: ACCENT }}
          >
            ← Voltar ao onboarding
          </Link>
        </p>
      </div>
    </div>
  );
}
