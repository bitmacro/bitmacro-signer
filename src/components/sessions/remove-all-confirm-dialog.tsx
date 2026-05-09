"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function RemoveAllConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const t = useTranslations("sessions");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-all-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label={t("modalDismiss")}
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative z-10 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl",
        )}
      >
        <h2 id="remove-all-title" className="text-lg font-bold text-white">
          {t("removeAllTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {t("removeAllBody")}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-950/70 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {loading ? t("removing") : t("removeAllConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
