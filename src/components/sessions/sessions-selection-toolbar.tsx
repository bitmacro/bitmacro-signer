"use client";

import clsx from "clsx";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function SessionsSelectionToolbar({
  selectedCount,
  visibleCount,
  onRemoveSelected,
  onSelectAllVisible,
  removing,
}: {
  selectedCount: number;
  visibleCount: number;
  onRemoveSelected: () => void;
  onSelectAllVisible: () => void;
  removing: boolean;
}) {
  const t = useTranslations("sessions");

  if (selectedCount === 0) return null;

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-xl border border-[#0066FF]/30 bg-[#0066FF]/10 p-4 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <p className="text-sm font-medium text-zinc-100">
        {t("selectedCount", { count: selectedCount })}
      </p>
      <div className="flex flex-wrap gap-2">
        {visibleCount > 0 ? (
          <button
            type="button"
            onClick={onSelectAllVisible}
            className="rounded-lg border border-zinc-600 bg-zinc-900/60 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            {t("selectAllVisible")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={removing}
          onClick={onRemoveSelected}
          className="inline-flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-950/60 disabled:opacity-50"
        >
          {removing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          {removing ? t("removing") : t("removeSelected")}
        </button>
      </div>
    </div>
  );
}
