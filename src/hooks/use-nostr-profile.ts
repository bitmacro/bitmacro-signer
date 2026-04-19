"use client";

import { useEffect, useState } from "react";

import {
  type NostrProfileMeta,
  fetchNostrProfileByNpub,
} from "@/lib/nostr/profile";

export function useNostrProfile(npub: string | null) {
  const [profile, setProfile] = useState<NostrProfileMeta | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const n = npub?.trim();
      if (!n) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setProfile(null);
      const p = await fetchNostrProfileByNpub(n);
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [npub]);

  return { profile, loading };
}
