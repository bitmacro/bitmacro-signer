"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Loader2, LogOut, UserRound } from "lucide-react";

import { useNostrProfile } from "@/hooks/use-nostr-profile";

type AuthStatusOk = {
  identity_id: string;
  is_running: boolean;
  vault_exists?: boolean;
  npub?: string | null;
};

function truncateMiddle(s: string, keep = 12): string {
  if (s.length <= keep * 2 + 3) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

async function fetchAuthStatus(): Promise<AuthStatusOk | null> {
  const res = await fetch("/api/auth/status", { credentials: "include" });
  if (!res.ok) return null;
  return (await res.json()) as AuthStatusOk;
}

export type SignerSessionUserMenuProps = {
  /**
   * When this value changes (e.g. panel `statusIdentity` / `sessionNpub` after unlock),
   * session status is re-fetched so the menu appears without a full page reload.
   */
  watchKey?: string;
};

export function SignerSessionUserMenu({
  watchKey = "",
}: SignerSessionUserMenuProps) {
  const t = useTranslations("sessionUserMenu");
  const [session, setSession] = useState<AuthStatusOk | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const s = await fetchAuthStatus();
    setSession(s);
    setChecked(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load, watchKey]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [session?.npub, session?.identity_id]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const npub = session?.npub?.trim() || null;
  const { profile, loading: profileLoading } = useNostrProfile(npub);

  const displayLabel = useMemo(() => {
    const dn = profile?.displayName?.trim();
    if (dn) return dn;
    const n = profile?.name?.trim();
    if (n) return n;
    if (npub) return truncateMiddle(npub, 10);
    if (session?.identity_id) return truncateMiddle(session.identity_id, 8);
    return t("fallbackUser");
  }, [npub, profile?.displayName, profile?.name, session?.identity_id, t]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/lock", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* still navigate away */
    } finally {
      window.location.href = "/";
    }
  };

  if (!checked || !session) {
    return null;
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("ariaLabel")}
        disabled={signingOut}
        className="flex max-w-[min(100vw-8rem,14rem)] items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 py-1 pl-1 pr-2 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-60"
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-950">
          {profile?.picture && !avatarBroken ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote avatar from Nostr kind:0
            <img
              src={profile.picture}
              alt=""
              width={32}
              height={32}
              referrerPolicy="no-referrer"
              className="size-full object-cover"
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <UserRound className="size-4 text-zinc-500" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span
              className="block truncate text-xs font-medium leading-tight text-zinc-200"
              title={npub ?? session.identity_id}
            >
              {displayLabel}
            </span>
            {profileLoading ? (
              <Loader2
                className="size-3 shrink-0 animate-spin text-zinc-500"
                aria-hidden
              />
            ) : null}
          </span>
          {profile?.nip05?.trim() ? (
            <span className="block truncate text-[10px] leading-tight text-zinc-500">
              {profile.nip05.trim()}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[12.5rem] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 py-1 shadow-xl"
        >
          <Link
            role="menuitem"
            href="/panel"
            className="block px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-900"
            onClick={() => setOpen(false)}
          >
            {t("panel")}
          </Link>
          <Link
            role="menuitem"
            href="/sessions"
            className="block px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-900"
            onClick={() => setOpen(false)}
          >
            {t("sessions")}
          </Link>
          <Link
            role="menuitem"
            href="/recover"
            className="block px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-900"
            onClick={() => setOpen(false)}
          >
            {t("recover")}
          </Link>
          <div className="my-1 border-t border-zinc-800" />
          <button
            role="menuitem"
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-red-950/30 disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4 shrink-0" aria-hidden />
            )}
            {t("endSession")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
