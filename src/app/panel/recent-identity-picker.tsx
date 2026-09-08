"use client";

import { useState } from "react";
import { UserRound, X } from "lucide-react";

import {
  type RecentIdentity,
  identityLabel,
} from "@/app/panel/recent-npubs";

function truncateMiddle(s: string, keep = 10): string {
  if (s.length <= keep * 2 + 1) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

export function RecentIdentityPicker({
  items,
  selectedNpub,
  onSelect,
  onForget,
  label,
  removeLabel,
  hint,
}: {
  items: RecentIdentity[];
  selectedNpub: string;
  onSelect: (npub: string) => void;
  onForget: (npub: string) => void;
  label: string;
  removeLabel: string;
  hint: string;
}) {
  const [broken, setBroken] = useState<Record<string, true>>({});
  const selected = selectedNpub.trim().toLowerCase();

  if (items.length === 0) return null;

  return (
    <div>
      <p className="bm-label text-zinc-400">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{hint}</p>
      <ul
        className="mt-3 space-y-2"
        role="listbox"
        aria-label={label}
      >
        {items.map((item) => {
          const isOn = selected === item.npub;
          const title = identityLabel(item, truncateMiddle(item.npub, 10));
          const showPic = Boolean(item.picture) && !broken[item.npub];
          return (
            <li key={item.npub} className="flex min-w-0 items-stretch">
              <button
                type="button"
                role="option"
                aria-selected={isOn}
                onClick={() => onSelect(item.npub)}
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-l-xl border px-3 py-2.5 text-left transition-colors ${
                  isOn
                    ? "border-[#0066FF] bg-[#0066FF]/15"
                    : "border-zinc-700 bg-zinc-900/80 hover:border-zinc-500"
                }`}
              >
                {showPic ? (
                  // eslint-disable-next-line @next/next/no-img-element -- kind:0 avatar URL
                  <img
                    src={item.picture}
                    alt=""
                    width={36}
                    height={36}
                    referrerPolicy="no-referrer"
                    className="size-9 shrink-0 rounded-full border border-zinc-700 object-cover"
                    onError={() =>
                      setBroken((prev) => ({ ...prev, [item.npub]: true }))
                    }
                  />
                ) : (
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-zinc-500"
                    aria-hidden
                  >
                    <UserRound className="size-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {title}
                  </span>
                  {item.nip05 && item.nip05 !== title ? (
                    <span className="mt-0.5 block truncate text-xs text-zinc-400">
                      {item.nip05}
                    </span>
                  ) : (
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">
                      {truncateMiddle(item.npub, 12)}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onForget(item.npub)}
                className="rounded-r-xl border border-l-0 border-zinc-700 bg-zinc-900/80 px-2.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                aria-label={removeLabel}
                title={removeLabel}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
