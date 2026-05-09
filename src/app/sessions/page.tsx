"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { RemoveAllConfirmDialog } from "@/components/sessions/remove-all-confirm-dialog";
import { SessionCard } from "@/components/sessions/session-card";
import { SessionsFilterBar } from "@/components/sessions/sessions-filter-bar";
import { SessionsSelectionToolbar } from "@/components/sessions/sessions-selection-toolbar";
import {
  filterSessionsByStatus,
  sortSessions,
  type SessionRow,
  type SortMode,
  type StatusFilter,
} from "@/components/sessions/session-utils";
import { SignerBuildStamp } from "@/components/signer-build-stamp";
import { SignerSessionUserMenu } from "@/components/signer-session-user-menu";

const ACCENT = "#0066FF";
const BG = "#080808";

export default function SessionsPage() {
  const t = useTranslations("sessions");
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("expires");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [removeAllLoading, setRemoveAllLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      const body = (await st.json()) as { identity_id?: string | null };
      if (!body.identity_id?.trim()) {
        setIdentityId(null);
        setRows(null);
        setError(t("sessionRequired"));
        return;
      }
      const identity_id = body.identity_id.trim();
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

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const visibleRows = useMemo(() => {
    if (!rows?.length) return [];
    const filtered = filterSessionsByStatus(rows, filter);
    return sortSessions(filtered, sort);
  }, [rows, filter, sort]);

  const sessionCount = rows?.length ?? 0;

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(visibleRows.map((r) => r.id));
  }, [visibleRows]);

  const showToastRemoved = useCallback((n: number) => {
    if (n <= 0) return;
    if (n === 1) setToast(t("toastRemoved"));
    else setToast(t("toastRemovedMany", { count: n }));
  }, [t]);

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
        setSelectedIds((p) => p.filter((id) => id !== sessionId));
        showToastRemoved(1);
        await load();
      } catch (e) {
        setRemoveError(e instanceof Error ? e.message : t("removeError"));
      } finally {
        setRemovingId(null);
      }
    },
    [load, showToastRemoved, t],
  );

  const handleRemoveSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const n = selectedIds.length;
    if (!window.confirm(t("bulkRemoveConfirm", { count: n }))) {
      return;
    }
    setRemoveError(null);
    setBulkRemoving(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selectedIds }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        removed?: number;
      };
      if (!res.ok) {
        throw new Error(j.error ?? t("bulkRemoveError"));
      }
      const removed = j.removed ?? n;
      setSelectedIds([]);
      showToastRemoved(removed);
      await load();
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : t("bulkRemoveError"));
    } finally {
      setBulkRemoving(false);
    }
  }, [load, selectedIds, showToastRemoved, t]);

  const handleRemoveAll = useCallback(async () => {
    setRemoveError(null);
    setRemoveAllLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        removed?: number;
      };
      if (!res.ok) {
        throw new Error(j.error ?? t("removeAllError"));
      }
      setSelectedIds([]);
      setToast(t("toastRemovedAll"));
      setRemoveAllOpen(false);
      await load();
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : t("removeAllError"));
    } finally {
      setRemoveAllLoading(false);
    }
  }, [load, t]);

  return (
    <div
      className="min-h-screen text-zinc-200 antialiased"
      style={{ backgroundColor: BG }}
    >
      {toast ? (
        <div
          className="fixed top-6 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-xl border border-emerald-900/50 bg-emerald-950/90 px-4 py-3 text-center text-sm font-medium text-emerald-50 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <RemoveAllConfirmDialog
        open={removeAllOpen}
        onClose={() => setRemoveAllOpen(false)}
        onConfirm={() => void handleRemoveAll()}
        loading={removeAllLoading}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        <header className="mb-8 border-b border-zinc-800 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {t("brand")}
            </p>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
              <SignerBuildStamp variant="compact" />
              {!identityId ? <LocaleSwitcher /> : null}
              <SignerSessionUserMenu watchKey={identityId ?? ""} />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[clamp(1.5rem,3vw+0.85rem,1.875rem)] font-bold leading-tight text-white">
                {t("title")}
                {!loading && rows !== null ? (
                  <span className="text-lg font-normal text-zinc-500">
                    {t("sessionCount", { count: sessionCount })}
                  </span>
                ) : null}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                {t("subtitle")}
              </p>
              {identityId ? (
                <p className="mt-2 break-all font-mono text-xs text-zinc-500">
                  {identityId}
                </p>
              ) : null}
            </div>

            {!loading && sessionCount > 0 ? (
              <button
                type="button"
                onClick={() => setRemoveAllOpen(true)}
                className="shrink-0 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/50"
              >
                {t("removeAllSessions")}
              </button>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-12 items-center gap-3 text-base text-zinc-300">
            <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            {t("loading")}
          </div>
        ) : null}

        {removeError ? (
          <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-base leading-relaxed text-red-100">
            {removeError}
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-base leading-relaxed text-amber-100">
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

        {!loading && rows !== null && identityId ? (
          rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-16 text-center">
              <Smartphone
                className="size-14 text-zinc-600"
                strokeWidth={1.25}
                aria-hidden
              />
              <p className="mt-4 max-w-sm text-base text-zinc-400">
                {t("empty")}
              </p>
              <Link
                href="/panel"
                className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: ACCENT }}
              >
                {t("back")}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <SessionsFilterBar
                filter={filter}
                sort={sort}
                onFilter={setFilter}
                onSort={setSort}
              />
              <SessionsSelectionToolbar
                selectedCount={selectedIds.length}
                visibleCount={visibleRows.length}
                onRemoveSelected={() => void handleRemoveSelected()}
                onSelectAllVisible={selectAllVisible}
                removing={bulkRemoving}
              />
              {visibleRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/20 px-6 py-12 text-center">
                  <p className="max-w-sm text-base text-zinc-400">
                    {t("emptyFilter")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-4 text-sm font-semibold text-[#0066FF] hover:underline"
                  >
                    {t("filterAll")}
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {visibleRows.map((r) => (
                    <SessionCard
                      key={r.id}
                      row={r}
                      selected={selectedIds.includes(r.id)}
                      onToggleSelect={toggleSelect}
                      onRemove={handleRemove}
                      removing={removingId === r.id}
                      copiedKey={copiedKey}
                      onCopied={(key) => {
                        setCopiedKey(key);
                        window.setTimeout(() => setCopiedKey(null), 2000);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          )
        ) : null}

        <p className="mt-12 text-base leading-relaxed">
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
