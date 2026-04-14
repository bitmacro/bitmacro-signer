/**
 * Session helpers (no DB). NIP-46 bunker URI shape; validity uses `used` + `expires_at`.
 */

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
 * @param bunkerPubkey — bunker npub (hex or bech32 per your stack)
 * @param relayUrl — WebSocket URL of the relay (e.g. wss://relay.bitmacro.io)
 * @param secret — one-time secret returned from authorizeApp (never store in logs)
 */
export function buildBunkerUri(
  bunkerPubkey: string,
  relayUrl: string,
  secret: string,
): string {
  const relay = encodeURIComponent(relayUrl);
  const sec = encodeURIComponent(secret);
  return `bunker://${bunkerPubkey}?relay=${relay}&secret=${sec}`;
}
