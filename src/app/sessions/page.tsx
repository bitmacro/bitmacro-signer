"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const ACCENT = "#0066FF";
const BG = "#080808";

type SessionRow = {
  id: string;
  vault_id: string;
  app_pubkey: string;
  app_name: string | null;
  used: boolean;
  expires_at: string;
  created_at: string;
};

export default function SessionsPage() {
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
              <li
                key={r.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-[13px]"
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-zinc-500">app</span>
                  <span className="font-mono text-[11px] text-zinc-300">
                    {r.app_name ?? "—"} · {r.app_pubkey.slice(0, 16)}…
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-zinc-500">
                  expira {new Date(r.expires_at).toLocaleString()}{" "}
                  {r.used ? "· usada" : ""}
                </div>
              </li>
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
