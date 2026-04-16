/**
 * Session helpers (no DB). NIP-46 bunker URI shape; validity uses `used` + `expires_at`.
 */

import * as nip19 from "nostr-tools/nip19";

function bytesToHexLower(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, "0");
  }
  return s;
}

/**
 * Normaliza npub1… ou 64-char hex para hex minúsculo (chave pública Nostr).
 * Usado no bunker URI, `app_pubkey` em sessões, etc.
 */
export function nostrPubkeyInputToHex(input: string): string {
  const t = input.trim();
  if (/^[0-9a-fA-F]{64}$/.test(t)) {
    return t.toLowerCase();
  }
  if (t.startsWith("npub1")) {
    const d = nip19.decode(t);
    if (d.type !== "npub") {
      throw new Error("Invalid npub: expected npub bech32");
    }
    const raw: unknown = d.data;
    if (raw instanceof Uint8Array) {
      return bytesToHexLower(raw);
    }
    if (typeof raw === "string") {
      const s = raw.trim();
      if (/^[0-9a-fA-F]{64}$/.test(s)) {
        return s.toLowerCase();
      }
    }
    throw new Error("Invalid npub decoded payload");
  }
  throw new Error("Esperado npub1… ou 64 caracteres hex (chave pública Nostr).");
}

/**
 * Bunker URI (NIP-46) must use 64-char hex pubkey, not bech32 npub.
 */
export function bunkerPubkeyToHex(bunkerPubkey: string): string {
  try {
    return nostrPubkeyInputToHex(bunkerPubkey);
  } catch {
    throw new Error("bunker_pubkey must be 64-char hex or npub1…");
  }
}

export type Session = {
  id: string;
  vault_id: string;
  app_pubkey: string;
  app_name: string | null;
  secret_hash: string;
  used: boolean;
  expires_at: string;
  created_at: string;
};

/** True if the session is still usable: not consumed and not past `expires_at`. */
export function isSessionValid(session: Session): boolean {
  if (session.used) return false;
  return new Date(session.expires_at).getTime() > Date.now();
}

/**
 * NIP-46-style bunker connection URI. Does not log or persist `secret`.
 * @param bunkerPubkey — bunker public key as 64-char hex or `npub1…` (normalized to hex in URI)
 * @param relayUrl — WebSocket URL of the relay (e.g. wss://relay.bitmacro.cloud)
 * @param secret — one-time secret returned from authorizeApp (never store in logs)
 */
export function buildBunkerUri(
  bunkerPubkey: string,
  relayUrl: string,
  secret: string,
): string {
  const pkHex = bunkerPubkeyToHex(bunkerPubkey);
  const relay = encodeURIComponent(relayUrl);
  const sec = encodeURIComponent(secret);
  return `bunker://${pkHex}?relay=${relay}&secret=${sec}`;
}
