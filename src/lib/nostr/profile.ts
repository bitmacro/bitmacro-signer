import { SimplePool } from "nostr-tools/pool";
import type { Event } from "nostr-tools";

import { nostrPubkeyInputToHex } from "@/lib/session/ttl";

/** Public relays used only to resolve kind:0 metadata when the app relay has no profile yet. */
const PROFILE_RELAY_FALLBACKS = ["wss://relay.damus.io", "wss://nos.lol"] as const;

export type NostrProfileMeta = {
  name?: string;
  displayName?: string;
  picture?: string;
  nip05?: string;
  about?: string;
};

function parseKind0Content(raw: string): NostrProfileMeta | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const name = typeof j.name === "string" ? j.name : undefined;
    const displayName =
      typeof j.display_name === "string" ? j.display_name : undefined;
    const picture = typeof j.picture === "string" ? j.picture : undefined;
    const nip05 = typeof j.nip05 === "string" ? j.nip05 : undefined;
    const about = typeof j.about === "string" ? j.about : undefined;
    if (!name && !displayName && !picture && !nip05 && !about) return null;
    return { name, displayName, picture, nip05, about };
  } catch {
    return null;
  }
}

function relayListForProfile(): string[] {
  const primary = process.env.NEXT_PUBLIC_RELAY_URL?.trim();
  const list = [primary, ...PROFILE_RELAY_FALLBACKS].filter(
    (u): u is string => Boolean(u),
  );
  return [...new Set(list)];
}

/**
 * Fetches the latest kind:0 for the given npub from the app relay (if configured) plus public fallbacks.
 * Browser-only — uses WebSocket.
 */
export async function fetchNostrProfileByNpub(
  npub: string,
): Promise<NostrProfileMeta | null> {
  if (typeof window === "undefined") return null;
  const hex = nostrPubkeyInputToHex(npub.trim());
  const relays = relayListForProfile();
  if (relays.length === 0) return null;

  const pool = new SimplePool();
  try {
    const events = await pool.querySync(
      relays,
      { kinds: [0], authors: [hex], limit: 12 },
      { maxWait: 8500 },
    );
    if (!events.length) return null;
    const latest = events.reduce<Event | null>((best, ev) => {
      if (!best || ev.created_at > best.created_at) return ev;
      return best;
    }, null);
    if (!latest?.content) return null;
    return parseKind0Content(latest.content);
  } catch {
    return null;
  } finally {
    pool.close(relays);
  }
}
