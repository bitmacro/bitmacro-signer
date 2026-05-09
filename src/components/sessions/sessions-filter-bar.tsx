"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import type { StatusFilter, SortMode } from "./session-utils";

const FILTER_KEYS: StatusFilter[] = ["all", "pending", "used", "expired"];
const SORT_KEYS: SortMode[] = ["expires", "newest", "oldest"];

export function SessionsFilterBar({
  filter,
  sort,
  onFilter,
  onSort,
}: {
  filter: StatusFilter;
  sort: SortMode;
  onFilter: (f: StatusFilter) => void;
  onSort: (s: SortMode) => void;
}) {
  const t = useTranslations("sessions");

  const filterLabels: Record<StatusFilter, string> = {
    all: t("filterAll"),
    pending: t("filterPending"),
    used: t("filterUsed"),
    expired: t("filterExpired"),
  };

  const sortLabels: Record<SortMode, string> = {
    expires: t("sortExpires"),
    newest: t("sortNewest"),
    oldest: t("sortOldest"),
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("filterAria")}
      >
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => onFilter(key)}
            className={clsx(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === key
                ? "border-[#0066FF] bg-[#0066FF]/15 text-white"
                : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
            )}
          >
            {filterLabels[key]}
          </button>
        ))}
      </div>

      <label className="flex min-w-0 items-center gap-2 text-sm text-zinc-400">
        <span className="shrink-0">{t("sortLabel")}</span>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortMode)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-100 sm:max-w-xs"
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {sortLabels[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
