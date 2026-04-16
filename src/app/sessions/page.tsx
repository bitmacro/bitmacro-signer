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
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-[13px]">
      {row.app_name ? (
        <p className="text-[15px] font-semibold leading-snug text-white">{row.app_name}</p>
      ) : (
        <p className="text-[13px] text-zinc-500">Sem etiqueta — definida ao gerar o QR no onboarding</p>
      )}
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        Chave de sessão no cliente (NIP-46)
      </p>
      {clientNpub ? (
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <code
            className="break-all font-mono text-[11px] leading-relaxed text-zinc-200"
            title={clientNpub}
          >
            {truncateHexMiddle(clientNpub, 18, 16)}
          </code>
          <button
            type="button"
            onClick={() => void copyNpub()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-2.5 py-1.5 text-[12px] text-zinc-200 hover:bg-zinc-800"
          >
            {copiedKey === kNpub ? (
              <Check className="size-3.5 text-emerald-400" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {copiedKey === kNpub ? "Copiado" : "Copiar npub"}
          </button>
        </div>
      ) : null}
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        Hex (técnico)
      </p>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <code
          className="break-all font-mono text-[11px] leading-relaxed text-zinc-400"
          title={row.app_pubkey}
        >
          {truncateHexMiddle(row.app_pubkey)}
        </code>
        <button
          type="button"
          onClick={() => void copyHex()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-[12px] text-zinc-400 hover:bg-zinc-800"
        >
          {copiedKey === kHex ? (
            <Check className="size-3.5 text-emerald-400" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copiedKey === kHex ? "Copiado" : "Copiar hex"}
        </button>
      </div>
      <div className="mt-2 text-[12px] text-zinc-500">
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
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-8 border-b border-zinc-800 pb-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            BitMacro Signer
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">Sessões activas</h1>
          {identityId ? (
            <p className="mt-2 font-mono text-[12px] text-zinc-500">{identityId}</p>
          ) : null}
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
            O NIP-46 não envia o nome da app: usa a <strong className="font-medium text-zinc-400">chave de sessão</strong>{" "}
            (npub/hex abaixo). Se definires uma <strong className="font-medium text-zinc-400">etiqueta</strong> ao gerar o
            QR, ela aparece em destaque.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            A carregar…
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-[13px] text-amber-100">
            {error}{" "}
            <Link
              href="/onboarding"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: ACCENT }}
            >
              Onboarding
            </Link>
          </div>
        ) : null}

        {rows && rows.length === 0 ? (
          <p className="text-[14px] text-zinc-500">Nenhuma sessão de cliente.</p>
        ) : null}

        {rows && rows.length > 0 ? (
          <ul className="space-y-3">
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

        <p className="mt-10 text-[13px]">
          <Link
            href="/onboarding"
            className="underline-offset-2 hover:underline"
            style={{ color: ACCENT }}
          >
            ← Voltar ao onboarding
          </Link>
        </p>
      </div>
    </div>
  );
}
