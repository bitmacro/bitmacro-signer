/**
 * Parse `nostrconnect://` URIs (NIP-46 client-initiated connection).
 * @see https://github.com/nostr-protocol/nips/blob/master/46.md
 */

import { nostrPubkeyInputToHex } from "./ttl";

export type ParsedNostrConnectUri = {
  clientPubkeyHex: string;
  relayUrls: string[];
  secret: string;
  appName?: string;
  clientUrl?: string;
  clientImage?: string;
  perms?: string;
};

function nonempty(s: string | null): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t.length ? t : undefined;
}

/**
 * Validates and parses a `nostrconnect://<hex-pubkey>?relay=...&secret=...` URI.
 * Multiple `relay` query params are allowed (NIP-46).
 */
export function parseNostrConnectUri(raw: string): ParsedNostrConnectUri {
  const trimmed = raw.trim();
  const prefix = "nostrconnect://";
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith(prefix)) {
    throw new Error("Expected URI starting with nostrconnect://");
  }

  const rest = trimmed.slice(prefix.length);
  const q = rest.indexOf("?");
  const hostPart = (q === -1 ? rest : rest.slice(0, q)).trim();
  if (!hostPart) {
    throw new Error("nostrconnect:// missing client pubkey");
  }

  const clientPubkeyHex = nostrPubkeyInputToHex(hostPart);

  const query = q === -1 ? "" : rest.slice(q + 1);
  const params = new URLSearchParams(query);

  const relays = params.getAll("relay").map((r) => r.trim()).filter(Boolean);
  if (relays.length === 0) {
    throw new Error("nostrconnect URI: at least one relay query parameter is required");
  }

  const secret = nonempty(params.get("secret"));
  if (!secret) {
    throw new Error("nostrconnect URI: secret query parameter is required");
  }

  return {
    clientPubkeyHex,
    relayUrls: relays,
    secret,
    appName: nonempty(params.get("name")),
    clientUrl: nonempty(params.get("url")),
    clientImage: nonempty(params.get("image")),
    perms: nonempty(params.get("perms")),
  };
}
